import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';

export default function ReceptionScreen() {
    const [pdfs, setPdfs] = useState([]);
    const navigation = useNavigation();

    const pickDocument = async () => {
        let result = await DocumentPicker.getDocumentAsync({
            type: 'application/pdf',
        });

        if (result.type === 'success') {
            setPdfs([...pdfs, result]);
        }
    };

    const openPdf = (uri) => {
        navigation.navigate('PdfViewer', { uri });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Réception des PDFs</Text>
            <TouchableOpacity style={styles.button} onPress={pickDocument}>
                <Text style={styles.buttonText}>Sélectionner un PDF</Text>
            </TouchableOpacity>
            <FlatList
                data={pdfs}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.pdfItem} onPress={() => openPdf(item.uri)}>
                        <Text>{item.name}</Text>
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
        backgroundColor: '#F5F5F5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#007BFF',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    pdfItem: {
        padding: 10,
        marginVertical: 5,
        backgroundColor: '#E0E0E0',
        borderRadius: 5,
    },
});
