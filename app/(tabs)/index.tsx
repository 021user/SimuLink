import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Alert,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ScrollView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { io } from 'socket.io-client';

const SERVER_IP = '172.20.175.181';

const templates = {
    "NFS": [
        { name: "Leucocytes", unit: "", value: "", reference: "4,00-10,00" },
        { name: "Hémoglobines", unit: "", value: "", reference: "11,5-16,0" },
        { name: "Hématocrites", unit: "", value: "", reference: "30,0-47,0" },
        { name: "VGM", unit: "", value: "", reference: "80-100" },
        { name: "Plaquette", unit: "", value: "", reference: "150-400" },
    ],
    "Ionogramme sanguin": [
        { name: "NA", unit: "mmol/L", value: "", reference: "137-143" },
        { name: "K", unit: "mmol/L", value: "", reference: "3,5-4,5" },
        { name: "Cl", unit: "mmol/L", value: "", reference: "97-105" },
        { name: "Bicarbonates", unit: "mmol/L", value: "", reference: "23-30" },
        { name: "Protides", unit: "g/L", value: "", reference: "65-75" },
        { name: "Urée", unit: "mmol/L", value: "", reference: "3-7" },
        { name: "Creatinine", unit: "mg/L", value: "", reference: "40-120" },
    ],
    "Bilan hépatique": [
        { name: "ASAT", unit: "UI", value: "", reference: "<35" },
        { name: "ALAT", unit: "UI", value: "", reference: "<33" },
        { name: "GGT", unit: "UI", value: "", reference: "<20" },
        { name: "PAL", unit: "UI", value: "", reference: "<140" },
    ],
    "Hémostase": [
        { name: "TP", unit: "%", value: "", reference: "normal" },
        { name: "TCA", unit: "", value: "", reference: "0.8-1.2" },
        { name: "Fibrinogène", unit: "g", value: "", reference: "2-4" },
    ],
    "GAZ du sang": [
        { name: "pH", unit: "", value: "", reference: "normal" },
        { name: "PaO2", unit: "mg/mHg", value: "", reference: "90-100" },
        { name: "PaCO2", unit: "mg/mHg", value: "", reference: "35-45" },
        { name: "CO2 total", unit: "mmol/L", value: "", reference: "20-35" },
        { name: "Bicarbonates", unit: "mmol/L", value: "", reference: "22-26" },
        { name: "pH", unit: "%", value: "", reference: "95-100" },
    ]
};

export default function PatientFolderScreen() {
    const [patientFolders, setPatientFolders] = useState([]);
    const [newFolderName, setNewFolderName] = useState('');
    const [selectedFolder, setSelectedFolder] = useState('');
    const [pdfList, setPdfList] = useState([]);
    const [socket, setSocket] = useState(null);

    // Champs pour le rapport
    const [reportName, setReportName] = useState('');
    const [reportDate, setReportDate] = useState('');
    // Champs pour ajout manuel d'une analyse
    const [analysisName, setAnalysisName] = useState('');
    const [analysisUnit, setAnalysisUnit] = useState('');
    const [analysisValue, setAnalysisValue] = useState('');
    // Liste des analyses (template ou ajout manuel)
    const [analysesList, setAnalysesList] = useState([]);
    // Sélection du template
    const [selectedTemplate, setSelectedTemplate] = useState('');

    useEffect(() => {
        const newSocket = io(`http://${SERVER_IP}:5000`);
        setSocket(newSocket);
        newSocket.on('new-pdf', fetchPDFList);
        fetchPatientFolders();
        return () => newSocket.close();
    }, []);

    useEffect(() => {
        if (selectedFolder) {
            fetchPDFList();
        }
    }, [selectedFolder]);

    const fetchPatientFolders = async () => {
        try {
            const response = await fetch(`http://${SERVER_IP}:5000/list-patient-folders`);
            const data = await response.json();
            if (response.ok) setPatientFolders(data);
        } catch (error) {
            console.error('Erreur lors de la récupération des dossiers', error);
        }
    };

    const addPatientFolder = async () => {
        if (!newFolderName.trim()) {
            Alert.alert('Erreur', 'Veuillez entrer un nom valide');
            return;
        }
        try {
            const response = await fetch(`http://${SERVER_IP}:5000/create-patient-folder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_name: newFolderName.trim() }),
            });
            const data = await response.json();
            if (response.ok) {
                setPatientFolders([...patientFolders, newFolderName.trim()]);
                setNewFolderName('');
                Alert.alert('Succès', data.message);
            }
        } catch (error) {
            Alert.alert('Erreur', 'Échec de la création du dossier');
        }
    };

    const fetchPDFList = async () => {
        try {
            const response = await fetch(`http://${SERVER_IP}:5000/list-pdfs-in-folder/${selectedFolder}`);
            const data = await response.json();
            if (response.ok) setPdfList(data);
        } catch (error) {
            console.error('Erreur lors de la récupération des PDFs', error);
        }
    };

    const generateReportInFolder = async () => {
        if (!selectedFolder) {
            Alert.alert('Erreur', 'Veuillez sélectionner un dossier patient');
            return;
        }
        if (!reportName || !reportDate || analysesList.length === 0) {
            Alert.alert('Erreur', 'Veuillez remplir tous les champs et ajouter au moins une analyse');
            return;
        }
        try {
            const response = await fetch(`http://${SERVER_IP}:5000/generate-pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: reportName,
                    date: reportDate,
                    analyses: analysesList,
                    patient_folder: selectedFolder,
                }),
            });
            const data = await response.json();
            if (response.ok) {
                Alert.alert('Succès', 'Le rapport a été généré et assigné au dossier');
                fetchPDFList();
                setReportName('');
                setReportDate('');
                setAnalysisName('');
                setAnalysisUnit('');
                setAnalysisValue('');
                setAnalysesList([]);
            }
        } catch (error) {
            Alert.alert('Erreur', 'Échec de la génération du rapport');
        }
    };

    const addAnalysis = () => {
        if (!analysisName || !analysisUnit || !analysisValue) {
            return Alert.alert('Erreur', 'Veuillez remplir tous les champs de l\'analyse');
        }
        setAnalysesList([...analysesList, { name: analysisName, unit: analysisUnit, value: analysisValue, reference: 'N/A' }]);
        setAnalysisName('');
        setAnalysisUnit('');
        setAnalysisValue('');
    };

    const removeAnalysis = (index) => {
        const updatedAnalyses = analysesList.filter((_, i) => i !== index);
        setAnalysesList(updatedAnalyses);
    };

    const applyTemplate = (templateName) => {
        setSelectedTemplate(templateName);
        if (templates[templateName]) {
            const items = templates[templateName].map(item => ({
                name: item.name,
                unit: item.unit || '',
                value: item.value || '',
                reference: item.reference || 'normal'
            }));
            setAnalysesList(items);
        } else {
            setAnalysesList([]);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.header}>Gestion des Dossiers Patients</Text>

            {/* Création de dossier */}
            <Text style={styles.sectionTitle}>Création de dossier</Text>
            <View style={styles.inputContainer}>
                <TextInput
                    placeholder="Nom du dossier patient"
                    value={newFolderName}
                    onChangeText={setNewFolderName}
                    style={styles.input}
                    placeholderTextColor="#999"
                />
                <TouchableOpacity onPress={addPatientFolder} style={styles.button}>
                    <Text style={styles.buttonText}>Ajouter</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={patientFolders}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => setSelectedFolder(item)}
                        style={[styles.folderItem, selectedFolder === item && styles.selectedFolder]}
                    >
                        <Text style={styles.folderText}>{item}</Text>
                    </TouchableOpacity>
                )}
            />

            {/* Rapport Médical */}
            <Text style={styles.sectionTitle}>Rapport Médical</Text>
            <View style={styles.inputContainer}>
                <TextInput
                    placeholder="Nom du rapport"
                    value={reportName}
                    onChangeText={setReportName}
                    style={styles.input}
                    placeholderTextColor="#999"
                />
                <TextInput
                    placeholder="Date (YYYY-MM-DD)"
                    value={reportDate}
                    onChangeText={setReportDate}
                    style={styles.input}
                    placeholderTextColor="#999"
                />
            </View>

            {/* Template */}
            <Text style={styles.sectionTitle}>Sélectionnez un Template</Text>
            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={selectedTemplate}
                    onValueChange={(itemValue) => applyTemplate(itemValue)}
                    style={styles.picker}
                >
                    <Picker.Item label="Sélectionner un template" value="" />
                    {Object.keys(templates).map(key => (
                        <Picker.Item key={key} label={key} value={key} />
                    ))}
                </Picker>
            </View>

            {/* Ajout / Modification d'analyse */}
            <Text style={styles.sectionTitle}>Ajouter / Modifier une Analyse</Text>
            <View style={styles.analysesContainer}>
                <TextInput
                    placeholder="Nom"
                    value={analysisName}
                    onChangeText={setAnalysisName}
                    style={[styles.input, styles.smallInput]}
                    placeholderTextColor="#999"
                />
                <TextInput
                    placeholder="Unité"
                    value={analysisUnit}
                    onChangeText={setAnalysisUnit}
                    style={[styles.input, styles.smallInput]}
                    placeholderTextColor="#999"
                />
                <TextInput
                    placeholder="Valeur"
                    value={analysisValue}
                    onChangeText={setAnalysisValue}
                    style={[styles.input, styles.smallInput]}
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                />
                <TouchableOpacity onPress={addAnalysis} style={[styles.button, styles.smallButton]}>
                    <Text style={styles.buttonText}>Ajouter</Text>
                </TouchableOpacity>
            </View>

            {/* Liste des analyses */}
            <View style={styles.analysesList}>
                {analysesList.map((item, index) => (
                    <View key={index} style={styles.analysisRow}>
                        <View style={styles.analysisColumn}>
                            <Text style={styles.analysisLabel}>
                                {item.name} ({item.unit})
                            </Text>
                            {item.reference && (
                                <Text style={styles.normalLabel}>Norme : {item.reference}</Text>
                            )}
                        </View>
                        <TextInput
                            style={styles.analysisInput}
                            placeholder="Saisir la valeur"
                            value={item.value}
                            editable={true}
                            keyboardType="numeric"
                            onChangeText={(newVal) => {
                                const newList = [...analysesList];
                                newList[index].value = newVal;
                                setAnalysesList(newList);
                            }}
                            placeholderTextColor="#999"
                        />
                        <TouchableOpacity onPress={() => removeAnalysis(index)} style={styles.removeButton}>
                            <Text style={styles.buttonText}>Supprimer</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </View>

            <TouchableOpacity onPress={generateReportInFolder} style={styles.button}>
                <Text style={styles.buttonText}>Générer le rapport</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>PDFs dans {selectedFolder || '...'}</Text>
            <FlatList
                data={pdfList}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => <Text style={styles.pdfItem}>{item}</Text>}
                ListEmptyComponent={<Text style={styles.emptyText}>Aucun PDF.</Text>}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: '#f2f6fa',
    },
    header: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
        color: '#005ea2',
    },
    inputContainer: {
        marginBottom: 15,
    },
    input: {
        height: 48,
        borderColor: '#cfd8dc',
        borderWidth: 1,
        borderRadius: 10,
        paddingLeft: 15,
        backgroundColor: '#fff',
        marginBottom: 10,
        fontSize: 16,
        color: '#333',
    },
    button: {
        backgroundColor: '#005ea2',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginVertical: 5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    folderItem: {
        padding: 15,
        borderWidth: 1,
        borderColor: '#cfd8dc',
        marginBottom: 8,
        borderRadius: 10,
        backgroundColor: '#fff',
    },
    selectedFolder: {
        borderColor: '#005ea2',
        backgroundColor: '#e1f5fe',
    },
    folderText: {
        fontSize: 16,
        color: '#333',
    },
    pdfItem: {
        padding: 10,
        fontSize: 14,
        color: '#555',
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        marginVertical: 10,
    },
    pickerContainer: {
        backgroundColor: '#fff',
        borderColor: '#cfd8dc',
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 15,
        overflow: 'hidden',
    },
    picker: {
        height: 48,
        width: '100%',
    },
    analysesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    smallInput: {
        width: '30%',
        marginRight: 5,
    },
    smallButton: {
        paddingHorizontal: 12,
        marginTop: 5,
    },
    analysesList: {
        marginBottom: 20,
    },
    analysisRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 10,
        elevation: 2,
    },
    analysisColumn: {
        flex: 1,
    },
    analysisLabel: {
        fontSize: 15,
        color: '#333',
    },
    normalLabel: {
        fontSize: 13,
        color: '#777',
        marginTop: 3,
    },
    analysisInput: {
        borderColor: '#cfd8dc',
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
        width: '30%',
        marginRight: 10,
        backgroundColor: '#fff',
        fontSize: 15,
        color: '#333',
    },
    removeButton: {
        backgroundColor: '#d32f2f',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
});
