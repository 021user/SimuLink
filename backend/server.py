import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';

export default function ReceptionScreen() {
    const [pdfList, setPdfList] = useState<string[]>([]);
    const SERVER_IP = '172.20.175.181';

    // fonction pour récupérer la liste des pdfs générés
    const fetchPDFList = async () => {
        try {
            const response = await fetch(`http://${SERVER_IP}:5000/list-pdfs`);
            const data = await response.json();
            if (response.ok) {
                setPdfList(data);
            } else {
                console.error('erreur lors de la récupération des pdfs');
            }
        } catch (error) {
            console.error('erreur lors de la récupération des pdfs', error);
        }
    };

    useEffect(() => {
        fetchPDFList();
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>réception des pdfs</Text>
            <FlatList
                data={pdfList}
                keyExtractor={(item) => item}
                ListEmptyComponent={<Text>aucun pdf reçu.</Text>}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => Alert.alert("pdf", item)}>
                        <Text style={styles.pdfItem}>{item}</Text>
                    </TouchableOpacity>
                )}
            />
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
    pdfItem: {
        fontSize: 16,
        color: '#007bff',
        marginVertical: 5,
    },
});
