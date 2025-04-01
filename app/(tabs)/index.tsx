import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { io } from 'socket.io-client';
import * as Notifications from 'expo-notifications'; // Pour les notifications

export default function SimuLinkScreen() {
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [analysis, setAnalysis] = useState('');
    const [generatedFilename, setGeneratedFilename] = useState('');
    const [remoteIP, setRemoteIP] = useState('');
    const [pdfList, setPdfList] = useState<string[]>([]);
    const [devices, setDevices] = useState<string[]>([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [socket, setSocket] = useState<any>(null);

    // Remplacez SERVER_IP par l'IP locale de votre PC (où tourne le backend Flask)
    const SERVER_IP = '172.20.175.181';

    // Configurer les notifications
    useEffect(() => {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            }),
        });
    }, []);

    // Connexion au WebSocket
    useEffect(() => {
        const newSocket = io(`http://${SERVER_IP}:5000`);
        setSocket(newSocket);

        // Écouter l'événement "new-pdf" pour afficher une notification
        newSocket.on('new-pdf', (data: { filename: string }) => {
            Alert.alert('PDF Généré', `Le PDF ${data.filename} est prêt`);
            fetchPDFList();
        });

        // Écouter l'événement "pdf-received" pour afficher une notification
        newSocket.on('pdf-received', async (data: { filename: string }) => {
            console.log('Événement "pdf-received" reçu :', data.filename);

            // Afficher une notification
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'PDF Reçu',
                    body: `Le PDF ${data.filename} vous a été envoyé`,
                },
                trigger: null, // Notification immédiate
            });

            fetchPDFList(); // Rafraîchir la liste des PDFs
        });

        // Écouter l'événement "devices" pour mettre à jour la liste des appareils
        newSocket.on('devices', (data: string[]) => {
            setDevices(data);
        });

        return () => {
            newSocket.close();
        };
    }, []);

    // Générer un PDF
    const generatePDF = async () => {
        try {
            const response = await fetch(`http://${SERVER_IP}:5000/generate-pdf`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': '*', // Permet d'éviter certaines erreurs CORS
                },
                body: JSON.stringify({ name, date, analysis }),
            });
            const data = await response.json();
            if (response.ok) {
                setGeneratedFilename(data.filename);
                Alert.alert('Succès', 'PDF généré : ' + data.filename);
                fetchPDFList();
            } else {
                Alert.alert('Erreur', data.error || 'Erreur lors de la génération');
            }
        } catch (error) {
            Alert.alert('Erreur', 'Erreur de connexion au serveur');
            console.error(error);
        }
    };

    // Envoyer un PDF à un appareil spécifique
    const sendPDF = async () => {
        if (!generatedFilename) {
            Alert.alert('Erreur', 'Aucun PDF généré');
            return;
        }
        if (!selectedDevice) {
            Alert.alert('Erreur', 'Sélectionnez un appareil dans la liste');
            return;
        }
        try {
            const response = await fetch(`http://${SERVER_IP}:5000/send-pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: generatedFilename, remote_ip: selectedDevice }),
            });
            const data = await response.json();
            if (response.ok) {
                Alert.alert('Succès', 'PDF envoyé à ' + selectedDevice);
            } else {
                Alert.alert('Erreur', data.error || 'Échec de l\'envoi');
            }
        } catch (error) {
            Alert.alert('Erreur', 'Échec de l\'envoi');
            console.error(error);
        }
    };

    // Récupérer la liste des PDFs
    const fetchPDFList = async () => {
        try {
            const response = await fetch(`http://${SERVER_IP}:5000/list-pdfs`);
            const data = await response.json();
            if (response.ok) {
                setPdfList(data);
            } else {
                console.error('Erreur lors de la récupération des PDFs');
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des PDFs', error);
        }
    };

    // Récupérer la liste des appareils connectés
    const fetchDevices = async () => {
        try {
            const response = await fetch(`http://${SERVER_IP}:5000/devices`);
            const data = await response.json();
            if (response.ok) {
                setDevices(data);
            } else {
                console.error('Erreur lors de la récupération des appareils');
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des appareils', error);
        }
    };

    // Charger la liste des appareils au montage du composant
    useEffect(() => {
        fetchDevices();
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Générer un PDF</Text>
            <TextInput
                placeholder="Nom"
                value={name}
                onChangeText={setName}
                style={styles.input}
            />
            <TextInput
                placeholder="Date (ex: 2025-02-24)"
                value={date}
                onChangeText={setDate}
                style={styles.input}
            />
            <TextInput
                placeholder="Analyse"
                value={analysis}
                onChangeText={setAnalysis}
                style={styles.input}
            />
            <Button title="Générer PDF" onPress={generatePDF} />

            <View style={styles.separator} />

            <Text style={styles.title}>Appareils connectés</Text>
            <FlatList
                data={devices}
                keyExtractor={(item) => item}
                ListEmptyComponent={<Text>Aucun appareil connecté.</Text>}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => setSelectedDevice(item)}
                        style={[styles.deviceItem, selectedDevice === item && styles.selectedDevice]}
                    >
                        <Text style={styles.deviceText}>{item}</Text>
                    </TouchableOpacity>
                )}
            />

            <View style={styles.separator} />

            <Button title="Envoyer PDF" onPress={sendPDF} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        marginTop: 40,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#000',
    },
    input: {
        height: 40,
        borderColor: '#000',
        borderWidth: 1,
        marginBottom: 10,
        paddingLeft: 10,
        backgroundColor: '#fff',
    },
    separator: {
        marginVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#000',
    },
    deviceItem: {
        padding: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        marginBottom: 5,
        borderRadius: 5,
    },
    deviceText: {
        fontSize: 16,
    },
    selectedDevice: {
        borderColor: '#007bff',
        backgroundColor: '#e0f0ff',
    },
});