import React, { useEffect, useState, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Platform,
    Linking
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Polyfill pour window en React Native
if (typeof window === 'undefined') {
    global.window = global as any;
}

import { io, Socket } from 'socket.io-client';

// Détection automatique de l'IP
const getServerIP = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        return window.location.hostname || 'localhost';
    }
    return '172.20.10.2';
};

const SERVER_IP = getServerIP();

export default function ReceptionScreen() {
    const [patientFolders, setPatientFolders] = useState<string[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [pdfList, setPdfList] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    const selectedFolderRef = useRef<string | null>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        selectedFolderRef.current = selectedFolder;
    }, [selectedFolder]);

    const fetchPatientFolders = async () => {
        setLoading(true);
        try {
            const resp = await fetch(`http://${SERVER_IP}:5000/list-patient-folders`);
            const data = await resp.json();
            if (resp.ok) setPatientFolders(data);
            else Alert.alert('❌ Erreur', data.error || 'Impossible de récupérer les dossiers');
        } catch (e) {
            console.error(e);
            Alert.alert('❌ Erreur', 'Impossible de récupérer les dossiers');
        } finally {
            setLoading(false);
        }
    };

    const fetchPublishedPDFs = async (folder: string) => {
        setLoading(true);
        try {
            const resp = await fetch(
                `http://${SERVER_IP}:5000/list-pdfs-in-folder/${folder}?published=true`
            );
            const data: string[] = await resp.json();
            if (resp.ok) setPdfList(data);
            else Alert.alert('❌ Erreur', data.error || 'Impossible de récupérer les PDFs');
        } catch (e) {
            console.error(e);
            Alert.alert('❌ Erreur', 'Impossible de récupérer les PDFs');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchPatientFolders();
        if (selectedFolder) {
            await fetchPublishedPDFs(selectedFolder);
        }
        setRefreshing(false);
    };

    const handleOpenPDF = (filename: string) => {
        if (!selectedFolderRef.current) return;
        const url = `http://${SERVER_IP}:5000/patients/${selectedFolderRef.current}/${filename}`;

        Linking.openURL(url).catch(err =>
            Alert.alert('Erreur', 'Impossible d\'ouvrir le PDF')
        );
    };

    useEffect(() => {
        fetchPatientFolders();

        const socket = io(`http://${SERVER_IP}:5000`);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('✓ Connecté au serveur');
        });

        socket.on('new-pdf', (payload: {
            patient_folder: string;
            filename: string;
            publish: boolean;
        }) => {
            if (
                payload.publish &&
                payload.patient_folder === selectedFolderRef.current
            ) {
                fetchPublishedPDFs(payload.patient_folder);
            }
        });

        socket.on('disconnect', () => {
            console.log('Déconnecté du serveur');
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (selectedFolder) {
            fetchPublishedPDFs(selectedFolder);
        } else {
            setPdfList([]);
        }
    }, [selectedFolder]);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <MaterialIcons name="cloud-download" size={32} color="#fff" />
                <Text style={styles.headerTitle}>Documents Reçus</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
                    <MaterialIcons name="refresh" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Section Dossiers */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <MaterialIcons name="folder-open" size={24} color="#667eea" />
                    <Text style={styles.sectionTitle}>Dossiers Patients</Text>
                </View>

                {loading && !patientFolders.length ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#667eea" />
                        <Text style={styles.loadingText}>Chargement...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={patientFolders}
                        horizontal
                        keyExtractor={item => item}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.folderList}
                        renderItem={({ item, index }) => (
                            <View>
                                <TouchableOpacity
                                    onPress={() => setSelectedFolder(item)}
                                    style={[
                                        styles.folderCard,
                                        selectedFolder === item && styles.selectedFolderCard
                                    ]}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.folderContent}>
                                        <MaterialIcons
                                            name={selectedFolder === item ? "folder-open" : "folder"}
                                            size={32}
                                            color={selectedFolder === item ? "#fff" : "#667eea"}
                                        />
                                        <Text
                                            style={[
                                                styles.folderName,
                                                selectedFolder === item && styles.selectedFolderName
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {item}
                                        </Text>
                                        {selectedFolder === item && (
                                            <View style={styles.badge}>
                                                <MaterialIcons name="check" size={16} color="#fff" />
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )}
                        ListEmptyComponent={
                            !loading ? (
                                <View style={styles.emptyContainer}>
                                    <MaterialIcons name="folder-off" size={48} color="#ccc" />
                                    <Text style={styles.emptyText}>Aucun dossier disponible</Text>
                                </View>
                            ) : null
                        }
                    />
                )}
            </View>

            {/* Section Documents */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <MaterialIcons name="description" size={24} color="#667eea" />
                    <Text style={styles.sectionTitle}>
                        {selectedFolder ? `Documents de ${selectedFolder}` : 'Sélectionnez un dossier'}
                    </Text>
                    {pdfList.length > 0 && (
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{pdfList.length}</Text>
                        </View>
                    )}
                </View>

                {loading && !!selectedFolder ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#667eea" />
                        <Text style={styles.loadingText}>Chargement des documents...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={pdfList}
                        keyExtractor={item => item}
                        contentContainerStyle={styles.pdfList}
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialIcons
                                    name={selectedFolder ? "insert-drive-file" : "folder-open"}
                                    size={64}
                                    color="#e0e0e0"
                                />
                                <Text style={styles.emptyText}>
                                    {selectedFolder
                                        ? 'Aucun document publié'
                                        : 'Sélectionnez un dossier pour voir les documents'}
                                </Text>
                            </View>
                        }
                        renderItem={({ item, index }) => (
                            <View>
                                <TouchableOpacity
                                    style={styles.pdfCard}
                                    onPress={() => handleOpenPDF(item)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.pdfCardContent}>
                                        <View style={styles.pdfIconContainer}>
                                            <MaterialIcons
                                                name="picture-as-pdf"
                                                size={32}
                                                color="#e74c3c"
                                            />
                                        </View>
                                        <View style={styles.pdfInfo}>
                                            <Text style={styles.pdfName} numberOfLines={2}>
                                                {item}
                                            </Text>
                                            <View style={styles.pdfMeta}>
                                                <MaterialIcons name="visibility" size={14} color="#27ae60" />
                                                <Text style={styles.metaText}>Document publié</Text>
                                            </View>
                                        </View>
                                        <MaterialIcons
                                            name="arrow-forward-ios"
                                            size={20}
                                            color="#ccc"
                                        />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                    />
                )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <MaterialIcons name="info-outline" size={16} color="#999" />
                <Text style={styles.footerText}>Serveur: {SERVER_IP}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        paddingHorizontal: 20,
        backgroundColor: '#667eea',
        elevation: 6,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    headerTitle: {
        flex: 1,
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginLeft: 12,
    },
    refreshButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    section: {
        marginTop: 16,
        paddingHorizontal: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginLeft: 8,
        flex: 1,
    },
    countBadge: {
        backgroundColor: '#667eea',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    countText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
    },
    folderList: {
        paddingVertical: 8,
    },
    folderCard: {
        marginRight: 12,
        borderRadius: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        backgroundColor: '#fff',
    },
    folderContent: {
        minWidth: 140,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedFolderCard: {
        elevation: 6,
        backgroundColor: '#667eea',
    },
    folderName: {
        fontSize: 14,
        color: '#333',
        marginTop: 8,
        fontWeight: '600',
        textAlign: 'center',
    },
    selectedFolderName: {
        color: '#fff',
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pdfList: {
        paddingBottom: 20,
    },
    pdfCard: {
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    pdfCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    pdfIconContainer: {
        width: 56,
        height: 56,
        backgroundColor: '#fee',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    pdfInfo: {
        flex: 1,
    },
    pdfName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 6,
    },
    pdfMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        fontSize: 12,
        color: '#27ae60',
        marginLeft: 4,
        fontWeight: '500',
    },
    separator: {
        height: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
        marginTop: 12,
        textAlign: 'center',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    footerText: {
        fontSize: 12,
        color: '#999',
        marginLeft: 6,
    },
});