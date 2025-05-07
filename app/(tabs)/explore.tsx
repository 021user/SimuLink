import React, { useEffect, useState, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { io, Socket } from 'socket.io-client';

const SERVER_IP = '172.20.10.2';

export default function ReceptionScreen() {
    const [patientFolders, setPatientFolders] = useState<string[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [pdfList, setPdfList] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    // Ref pour toujours garder la dernière valeur de selectedFolder
    const selectedFolderRef = useRef<string | null>(null);

    // Ref pour la socket
    const socketRef = useRef<Socket | null>(null);

    // Met à jour la ref à chaque changement de selectedFolder
    useEffect(() => {
        selectedFolderRef.current = selectedFolder;
    }, [selectedFolder]);

    // Récupère la liste des dossiers
    const fetchPatientFolders = async () => {
        setLoading(true);
        try {
            const resp = await fetch(`http://${SERVER_IP}:5000/list-patient-folders`);
            const data = await resp.json();
            if (resp.ok) setPatientFolders(data);
            else Alert.alert('Erreur', data.error || 'Impossible de récupérer les dossiers');
        } catch (e) {
            console.error(e);
            Alert.alert('Erreur', 'Impossible de récupérer les dossiers');
        } finally {
            setLoading(false);
        }
    };

    // Récupère uniquement les PDFs publiés pour le dossier sélectionné
    const fetchPublishedPDFs = async (folder: string) => {
        setLoading(true);
        try {
            const resp = await fetch(
                `http://${SERVER_IP}:5000/list-pdfs-in-folder/${folder}?published=true`
            );
            const data: string[] = await resp.json();
            if (resp.ok) setPdfList(data);
            else Alert.alert('Erreur', data.error || 'Impossible de récupérer les PDFs');
        } catch (e) {
            console.error(e);
            Alert.alert('Erreur', 'Impossible de récupérer les PDFs');
        } finally {
            setLoading(false);
        }
    };

    // Ouvre le PDF
    const handleOpenPDF = (filename: string) => {
        if (!selectedFolderRef.current) return;
        const url = `http://${SERVER_IP}:5000/patients/${selectedFolderRef.current}/${filename}`;
        window.open(url, '_blank');
    };

    // Au montage : dossiers + socket
    useEffect(() => {
        fetchPatientFolders();

        const socket = io(`http://${SERVER_IP}:5000`);
        socketRef.current = socket;

        socket.on('new-pdf', (payload: {
            patient_folder: string;
            filename: string;
            publish: boolean;
        }) => {
            // On lit la ref pour avoir la valeur actuelle
            if (
                payload.publish &&
                payload.patient_folder === selectedFolderRef.current
            ) {
                fetchPublishedPDFs(payload.patient_folder);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // Dès que le dossier change, on recharge la liste
    useEffect(() => {
        if (selectedFolder) {
            fetchPublishedPDFs(selectedFolder);
        } else {
            setPdfList([]);
        }
    }, [selectedFolder]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <MaterialIcons name="cloud-download" size={28} color="#fff" />
                <Text style={styles.headerTitle}>Documents Reçus</Text>
            </View>

            <Text style={styles.sectionTitle}>Dossiers Patients</Text>
            {loading && !patientFolders.length ? (
                <ActivityIndicator size="large" color="#4a90e2" />
            ) : (
                <FlatList
                    data={patientFolders}
                    horizontal
                    keyExtractor={item => item}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.folderList}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => setSelectedFolder(item)}
                            style={[
                                styles.folderCard,
                                selectedFolder === item && styles.selectedFolderCard
                            ]}
                        >
                            <MaterialIcons name="folder" size={24} color="#4a90e2" />
                            <Text style={styles.folderName} numberOfLines={1}>
                                {item}
                            </Text>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        !loading ? (
                            <Text style={styles.emptyText}>Aucun dossier disponible</Text>
                        ) : null
                    }
                />
            )}

            <Text style={styles.sectionTitle}>
                PDFs dans {selectedFolder || '…'}
            </Text>
            {loading && !!selectedFolder ? (
                <ActivityIndicator size="large" color="#4a90e2" />
            ) : (
                <FlatList
                    data={pdfList}
                    keyExtractor={item => item}
                    contentContainerStyle={styles.pdfList}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="folder-open" size={50} color="#7f8c8d" />
                            <Text style={styles.emptyText}>Aucun document disponible</Text>
                        </View>
                    }
                    renderItem={({ item, index }) => (
                        <Animatable.View
                            animation="fadeInUp"
                            duration={400}
                            delay={index * 100}
                            style={styles.cardContainer}
                        >
                            <TouchableOpacity
                                style={styles.pdfCard}
                                onPress={() => handleOpenPDF(item)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.pdfInfo}>
                                    <MaterialIcons
                                        name="picture-as-pdf"
                                        size={24}
                                        color="#e74c3c"
                                    />
                                    <Text style={styles.pdfName} numberOfLines={1}>
                                        {item}
                                    </Text>
                                </View>
                                <MaterialIcons
                                    name="chevron-right"
                                    size={24}
                                    color="#95a5a6"
                                />
                            </TouchableOpacity>
                        </Animatable.View>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#eef2f9', paddingTop: 30 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4a90e2',
        paddingVertical: 20,
        paddingHorizontal: 15,
        elevation: 5,
        marginBottom: 20,
    },
    headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginLeft: 10 },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginHorizontal: 20,
        marginBottom: 10,
    },
    folderList: { paddingHorizontal: 20 },
    folderCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginRight: 15,
        elevation: 3,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedFolderCard: { borderColor: '#4a90e2' },
    folderName: { fontSize: 16, color: '#4a4a4a', marginLeft: 10 },
    pdfList: { paddingHorizontal: 20, paddingBottom: 20 },
    cardContainer: { marginBottom: 12 },
    pdfCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        elevation: 3,
    },
    pdfInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    pdfName: { flex: 1, fontSize: 16, color: '#333', marginLeft: 15 },
    separator: { height: 12 },
    emptyContainer: { flex: 1, alignItems: 'center', paddingVertical: 50 },
    emptyText: { fontSize: 16, color: '#7f8c8d', marginTop: 15 },
    loadingIndicator: { marginTop: 20 },
});
