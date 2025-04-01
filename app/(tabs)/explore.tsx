import React, { useEffect, useState } from 'react';
type PdfSource = { uri: string } | null;
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableWithoutFeedback,
    TouchableOpacity,
    Alert,
    Platform,
    Linking,
    ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import RNFS from 'react-native-fs';
import * as Animatable from 'react-native-animatable';

export default function ReceptionScreen() {
    const [pdfList, setPdfList] = useState<string[]>([]);
    const [patientFolders, setPatientFolders] = useState<string[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const SERVER_IP = '172.20.175.181';

    // Récupération des dossiers patients
    const fetchPatientFolders = async () => {
        setLoading(true);
        try {
            const response = await fetch(`http://${SERVER_IP}:5000/list-patient-folders`);
            const data = await response.json();
            if (response.ok) {
                setPatientFolders(data);
            } else {
                Alert.alert('Erreur', data.error || 'Erreur lors de la récupération des dossiers');
            }
        } catch (error) {
            console.error('Erreur de récupération des dossiers patients', error);
            Alert.alert('Erreur', 'Impossible de récupérer les dossiers patients');
        } finally {
            setLoading(false);
        }
    };

    // Récupération des PDFs dans un dossier patient
    const fetchPDFsInFolder = async (folderName: string) => {
        setLoading(true);
        try {
            const response = await fetch(`http://${SERVER_IP}:5000/list-pdfs-in-folder/${folderName}`);
            const data = await response.json();
            if (response.ok) {
                setPdfList(data);
            } else {
                Alert.alert('Erreur', data.error || 'Erreur lors de la récupération des PDFs');
            }
        } catch (error) {
            console.error('Erreur de récupération des PDFs', error);
            Alert.alert('Erreur', 'Impossible de récupérer les PDFs');
        } finally {
            setLoading(false);
        }
    };

    // Ouvrir un PDF
    const handleOpenPDF = async (filename: string) => {
        const pdfUrl = `http://${SERVER_IP}:5000/patients/${selectedFolder}/${filename}`;
        console.log("URL générée:", pdfUrl);
        try {
            const response = await fetch(pdfUrl);
            if (response.ok) {
                window.open(pdfUrl, "_blank"); // Ouvre le PDF dans un nouvel onglet
            } else {
                Alert.alert("Erreur", "Le fichier PDF est introuvable.");
            }
        } catch (error) {
            Alert.alert("Erreur", "Impossible de récupérer le PDF.");
            console.error("Erreur de récupération du PDF:", error);
        }
    };

    useEffect(() => {
        fetchPatientFolders();
    }, []);

    useEffect(() => {
        if (selectedFolder) {
            fetchPDFsInFolder(selectedFolder);
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
            {loading ? (
                <ActivityIndicator size="large" color="#4a90e2" style={styles.loadingIndicator} />
            ) : (
                <FlatList
                    data={patientFolders}
                    keyExtractor={(item) => item}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.folderList}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Aucun dossier patient disponible</Text>
                    }
                    renderItem={({ item }) => (
                        <TouchableWithoutFeedback onPress={() => setSelectedFolder(item)}>
                            <View
                                style={[
                                    styles.folderCard,
                                    selectedFolder === item && styles.selectedFolderCard
                                ]}
                            >
                                <MaterialIcons name="folder" size={24} color="#4a90e2" />
                                <Text style={styles.folderName} numberOfLines={1}>{item}</Text>
                            </View>
                        </TouchableWithoutFeedback>
                    )}
                />
            )}

            <Text style={styles.sectionTitle}>PDFs dans le dossier</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#4a90e2" style={styles.loadingIndicator} />
            ) : (
                <FlatList
                    data={pdfList}
                    keyExtractor={(item) => item}
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
                            duration={500}
                            delay={index * 100}
                            style={styles.cardContainer}
                        >
                            <TouchableOpacity
                                style={styles.pdfCard}
                                onPress={() => handleOpenPDF(item)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.pdfInfo}>
                                    <MaterialIcons name="picture-as-pdf" size={24} color="#e74c3c" />
                                    <Text style={styles.pdfName} numberOfLines={1}>{item}</Text>
                                </View>
                                <MaterialIcons name="chevron-right" size={24} color="#95a5a6" />
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
    container: {
        flex: 1,
        backgroundColor: '#eef2f9',
        paddingTop: 30,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4a90e2',
        paddingVertical: 20,
        paddingHorizontal: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginLeft: 10,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginHorizontal: 20,
        marginBottom: 10,
    },
    folderList: {
        paddingHorizontal: 20,
    },
    folderCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginRight: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        borderWidth: 2,
        borderColor: 'transparent' // Bordure par défaut transparente
    },
    selectedFolderCard: {
        borderColor: '#4a90e2' // Bordure bleue pour le dossier sélectionné
    },
    folderName: {
        fontSize: 16,
        color: '#4a4a4a',
        marginLeft: 10,
    },
    pdfList: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    cardContainer: {
        marginBottom: 12,
    },
    pdfCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    pdfInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    pdfName: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        marginLeft: 15,
    },
    separator: {
        height: 12,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    emptyText: {
        fontSize: 16,
        color: '#7f8c8d',
        marginTop: 15,
    },
    loadingIndicator: {
        marginTop: 20,
    },
});
