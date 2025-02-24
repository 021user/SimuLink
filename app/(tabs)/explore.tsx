import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import * as Notifications from 'expo-notifications';

export default function ReceptionScreen() {
    const [pdfList, setPdfList] = useState<string[]>([]);
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
        const socket = io(`http://${SERVER_IP}:5000`);

        socket.on('pdf-received', async (data: { filename: string }) => {
            console.log('Événement "pdf-received" reçu :', data.filename);

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'PDF Reçu',
                    body: `Le PDF ${data.filename} vous a été envoyé`,
                },
                trigger: null,
            });

            fetchPDFList(); // Rafraîchir la liste des PDFs
        });

        return () => {
            socket.disconnect();
        };
    }, []);

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

    // Ouvrir un PDF
    const handlePDFPress = (item: string) => {
        const pdfUrl = `http://${SERVER_IP}:5000/pdfs/${item}`;
        Linking.openURL(pdfUrl).catch((err) => {
            console.error("Erreur lors de l'ouverture du PDF", err);
            Alert.alert("Erreur", "Impossible d'ouvrir le PDF");
        });
    };

    // Charger la liste des PDFs au montage du composant
    useEffect(() => {
        fetchPDFList();
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Réception des PDFs</Text>
                <MaterialIcons name="cloud-download" size={24} color="#fff" />
            </View>

            <FlatList
                data={pdfList}
                keyExtractor={(item) => item}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="folder-open" size={50} color="#7a7a7a" />
                        <Text style={styles.emptyText}>Aucun PDF reçu</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.pdfCard}
                        onPress={() => handlePDFPress(item)}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="picture-as-pdf" size={24} color="#e74c3c" />
                        <Text style={styles.pdfName} numberOfLines={1}>{item}</Text>
                        <MaterialIcons name="chevron-right" size={24} color="#95a5a6" />
                    </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2c3e50',
        paddingVertical: 20,
        paddingHorizontal: 15,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    title: {
        fontSize: 22,
        fontWeight: '600',
        color: '#fff',
        marginRight: 10,
    },
    listContent: {
        paddingHorizontal: 15,
        paddingVertical: 20,
    },
    pdfCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    pdfName: {
        flex: 1,
        fontSize: 16,
        color: '#34495e',
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
        color: '#95a5a6',
        marginTop: 15,
    },
});