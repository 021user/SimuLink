import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Alert,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Switch
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { io } from 'socket.io-client';

const SERVER_IP = '172.20.10.2';

const templates = {
    NFS: [
        { name: 'Leucocytes', unit: '', value: '', reference: '4,00-10,00' },
        { name: 'Hémoglobines', unit: '', value: '', reference: '11,5-16,0' },
        { name: 'Hématocrites', unit: '', value: '', reference: '30,0-47,0' },
        { name: 'VGM', unit: '', value: '', reference: '80-100' },
        { name: 'Plaquette', unit: '', value: '', reference: '150-400' },
    ],
    'Ionogramme sanguin': [
        { name: 'NA', unit: 'mmol/L', value: '', reference: '137-143' },
        { name: 'K', unit: 'mmol/L', value: '', reference: '3,5-4,5' },
        { name: 'Cl', unit: 'mmol/L', value: '', reference: '97-105' },
        { name: 'Bicarbonates', unit: 'mmol/L', value: '', reference: '23-30' },
        { name: 'Protides', unit: 'g/L', value: '', reference: '65-75' },
        { name: 'Urée', unit: 'mmol/L', value: '', reference: '3-7' },
        { name: 'Creatinine', unit: 'mg/L', value: '', reference: '40-120' },
    ],
    'Bilan hépatique': [
        { name: 'ASAT', unit: 'UI', value: '', reference: '<35' },
        { name: 'ALAT', unit: 'UI', value: '', reference: '<33' },
        { name: 'GGT', unit: 'UI', value: '', reference: '<20' },
        { name: 'PAL', unit: 'UI', value: '', reference: '<140' },
    ],
    Hémostase: [
        { name: 'TP', unit: '%', value: '', reference: 'normal' },
        { name: 'TCA', unit: '', value: '', reference: '0.8-1.2' },
        { name: 'Fibrinogène', unit: 'g', value: '', reference: '2-4' },
    ],
    'GAZ du sang': [
        { name: 'pH', unit: '', value: '', reference: 'normal' },
        { name: 'PaO2', unit: 'mg/mHg', value: '', reference: '90-100' },
        { name: 'PaCO2', unit: 'mg/mHg', value: '', reference: '35-45' },
        { name: 'CO2 total', unit: 'mmol/L', value: '', reference: '20-35' },
        { name: 'Bicarbonates', unit: 'mmol/L', value: '', reference: '22-26' },
        { name: 'pH', unit: '%', value: '', reference: '95-100' },
    ],
};

export default function PatientFolderScreen() {
    const [patientFolders, setPatientFolders] = useState<string[]>([]);
    const [newFolderName, setNewFolderName] = useState('');
    const [selectedFolder, setSelectedFolder] = useState('');
    const [pdfList, setPdfList] = useState<string[]>([]);
    const [socket, setSocket] = useState<any>(null);

    const [reportName, setReportName] = useState('');
    const [reportDate, setReportDate] = useState('');
    const [analysisName, setAnalysisName] = useState('');
    const [analysisUnit, setAnalysisUnit] = useState('');
    const [analysisValue, setAnalysisValue] = useState('');
    const [analysesList, setAnalysesList] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [publishToReception, setPublishToReception] = useState(true);

    // fichier → publié ?
    const [pdfVisibility, setPdfVisibility] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const s = io(`http://${SERVER_IP}:5000`);
        setSocket(s);
        s.on('new-pdf', fetchPDFList);
        fetchPatientFolders();
        return () => s.disconnect();
    }, []);

    useEffect(() => {
        if (selectedFolder) fetchPDFList();
    }, [selectedFolder]);

    async function fetchPatientFolders() {
        try {
            const res = await fetch(`http://${SERVER_IP}:5000/list-patient-folders`);
            const js: string[] = await res.json();
            if (res.ok) setPatientFolders(js);
        } catch (e) {
            console.error(e);
        }
    }

    async function fetchPDFList() {
        if (!selectedFolder) return;
        try {
            // tous les PDFs
            const allR = await fetch(
                `http://${SERVER_IP}:5000/list-pdfs-in-folder/${selectedFolder}`
            );
            const all: string[] = await allR.json();
            // seulement publiés
            const pubR = await fetch(
                `http://${SERVER_IP}:5000/list-pdfs-in-folder/${selectedFolder}?published=true`
            );
            const pub: string[] = await pubR.json();

            if (allR.ok && pubR.ok) {
                setPdfList(all);
                const vis: Record<string, boolean> = {};
                all.forEach(f => (vis[f] = pub.includes(f)));
                setPdfVisibility(vis);
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function addPatientFolder() {
        if (!newFolderName.trim()) {
            return Alert.alert('Erreur', 'Veuillez entrer un nom valide');
        }
        try {
            const res = await fetch(
                `http://${SERVER_IP}:5000/create-patient-folder`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ folder_name: newFolderName.trim() }),
                }
            );
            const js = await res.json();
            if (res.ok) {
                setPatientFolders([...patientFolders, newFolderName.trim()]);
                setNewFolderName('');
                Alert.alert('Succès', js.message);
            }
        } catch {
            Alert.alert('Erreur', 'Échec de la création du dossier');
        }
    }

    async function generateReportInFolder() {
        if (!selectedFolder) {
            return Alert.alert('Erreur', 'Veuillez sélectionner un dossier patient');
        }
        if (!reportName || !reportDate || analysesList.length === 0) {
            return Alert.alert(
                'Erreur',
                'Veuillez remplir tous les champs et ajouter au moins une analyse'
            );
        }
        try {
            const res = await fetch(`http://${SERVER_IP}:5000/generate-pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: reportName,
                    date: reportDate,
                    analyses: analysesList,
                    patient_folder: selectedFolder,
                    publish: publishToReception,
                }),
            });
            const js = await res.json();
            if (res.ok) {
                Alert.alert('Succès', 'Le rapport a été généré');
                fetchPDFList();
                // reset
                setReportName('');
                setReportDate('');
                setAnalysisName('');
                setAnalysisUnit('');
                setAnalysisValue('');
                setAnalysesList([]);
            }
        } catch {
            Alert.alert('Erreur', 'Échec de la génération du rapport');
        }
    }

    function addAnalysis() {
        if (!analysisName || !analysisUnit || !analysisValue) {
            return Alert.alert('Erreur', 'Veuillez remplir tous les champs de l’analyse');
        }
        setAnalysesList([
            ...analysesList,
            { name: analysisName, unit: analysisUnit, value: analysisValue, reference: 'N/A' },
        ]);
        setAnalysisName('');
        setAnalysisUnit('');
        setAnalysisValue('');
    }

    function removeAnalysis(i: number) {
        setAnalysesList(analysesList.filter((_, idx) => idx !== i));
    }

    function applyTemplate(name: string) {
        setSelectedTemplate(name);
        if (templates[name]) {
            setAnalysesList(templates[name].map(item => ({
                name: item.name,
                unit: item.unit,
                value: item.value,
                reference: item.reference,
            })));
        } else {
            setAnalysesList([]);
        }
    }

    const togglePdfVisibility = async (file: string) => {
        const next = !pdfVisibility[file];
        // 1) mise à jour locale
        setPdfVisibility(prev => ({ ...prev, [file]: next }));
        // 2) appel au serveur
        try {
            const res = await fetch(`http://${SERVER_IP}:5000/set-publish`, {
                method: 'POST',
                headers: { 'Content-Type':'application/json' },
                body: JSON.stringify({
                    patient_folder: selectedFolder,
                    filename: file,
                    publish: next
                })
            });
            if (!res.ok) throw new Error();
        } catch {
            Alert.alert('Erreur', 'Impossible de mettre à jour la publication');
            // rollback local
            setPdfVisibility(prev => ({ ...prev, [file]: !next }));
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

            {/* Liste dossiers */}
            <FlatList
                data={patientFolders}
                keyExtractor={(_, i) => i.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => setSelectedFolder(item)}
                        style={[
                            styles.folderItem,
                            selectedFolder === item && styles.selectedFolder
                        ]}
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
                    onValueChange={applyTemplate}
                    style={styles.picker}
                >
                    <Picker.Item label="Sélectionner un template" value="" />
                    {Object.keys(templates).map(key => (
                        <Picker.Item key={key} label={key} value={key} />
                    ))}
                </Picker>
            </View>

            {/* Ajout d’analyse */}
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

            {analysesList.map((item, idx) => (
                <View key={idx} style={styles.analysisRow}>
                    <View style={styles.analysisColumn}>
                        <Text style={styles.analysisLabel}>
                            {item.name} ({item.unit})
                        </Text>
                        <Text style={styles.normalLabel}>Norme : {item.reference}</Text>
                    </View>
                    <TextInput
                        style={styles.analysisInput}
                        value={item.value}
                        onChangeText={v => {
                            const c = [...analysesList]; c[idx].value = v; setAnalysesList(c);
                        }}
                        keyboardType="numeric"
                        placeholder="Valeur"
                        placeholderTextColor="#999"
                    />
                    <TouchableOpacity onPress={() => removeAnalysis(idx)} style={styles.removeButton}>
                        <Text style={styles.buttonText}>Suppr</Text>
                    </TouchableOpacity>
                </View>
            ))}

            {/* Publier toggle */}
            <View style={styles.toggleContainer}>
                <Text style={styles.toggleLabel}>Publier en Réception</Text>
                <Switch
                    value={publishToReception}
                    onValueChange={setPublishToReception}
                    trackColor={{ true: '#4caf50', false: '#ccc' }}
                    thumbColor="#fff"
                />
            </View>

            <TouchableOpacity onPress={generateReportInFolder} style={styles.button}>
                <Text style={styles.buttonText}>Générer le rapport</Text>
            </TouchableOpacity>

            {/* Liste des PDFs */}
            <Text style={styles.sectionTitle}>PDFs dans {selectedFolder || '…'}</Text>
            {pdfList.length === 0 ? (
                <Text style={styles.emptyText}>Aucun PDF.</Text>
            ) : (
                pdfList.map(file => (
                    <View key={file} style={styles.pdfRow}>
                        <Text style={styles.pdfName}>{file}</Text>
                        <Switch
                            value={!!pdfVisibility[file]}
                            onValueChange={() => togglePdfVisibility(file)}
                            trackColor={{ true: '#4caf50', false: '#ccc' }}
                            thumbColor="#fff"
                        />
                        <Text style={styles.pdfLabel}>
                            affiché {pdfVisibility[file] ? 'oui' : 'non'}
                        </Text>
                    </View>
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 20, backgroundColor: '#f2f6fa' },
    header: { fontSize: 22, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#005ea2', marginTop: 20, marginBottom: 10 },
    inputContainer: { marginBottom: 15 },
    input: {
        height: 48, borderWidth: 1, borderColor: '#cfd8dc',
        borderRadius: 10, paddingHorizontal: 15,
        backgroundColor: '#fff', marginBottom: 10,
        fontSize: 16, color: '#333'
    },
    pickerContainer: {
        backgroundColor: '#fff', borderWidth: 1,
        borderColor: '#cfd8dc', borderRadius: 10,
        marginBottom: 15, overflow: 'hidden'
    },
    picker: { height: 48, width: '100%' },
    analysesContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15 },
    smallInput: { width: '30%', marginRight: 5 },
    smallButton: { paddingHorizontal: 12, marginTop: 5 },
    button: {
        backgroundColor: '#005ea2', paddingVertical: 14,
        borderRadius: 10, alignItems: 'center', marginVertical: 5
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    folderItem: {
        padding: 15, borderWidth: 1, borderColor: '#cfd8dc',
        borderRadius: 10, backgroundColor: '#fff', marginBottom: 8
    },
    selectedFolder: { borderColor: '#005ea2', backgroundColor: '#e1f5fe' },
    folderText: { fontSize: 16, color: '#333' },
    analysisRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', padding: 12,
        borderRadius: 10, elevation: 2, marginBottom: 10
    },
    analysisColumn: { flex: 1 },
    analysisLabel: { fontSize: 15, color: '#333' },
    normalLabel: { fontSize: 13, color: '#777', marginTop: 3 },
    analysisInput: {
        width: '30%', marginHorizontal: 10,
        borderWidth: 1, borderColor: '#cfd8dc',
        borderRadius: 8, padding: 8,
        backgroundColor: '#fff', fontSize: 15, color: '#333'
    },
    removeButton: {
        backgroundColor: '#d32f2f', paddingVertical: 8,
        paddingHorizontal: 12, borderRadius: 8
    },
    toggleContainer: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', backgroundColor: '#fff',
        padding: 12, borderRadius: 8, borderWidth: 1,
        borderColor: '#cfd8dc', marginVertical: 10
    },
    toggleLabel: { fontSize: 16, color: '#333' },
    pdfRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', padding: 12,
        borderRadius: 8, marginBottom: 8,
        borderWidth: 1, borderColor: '#cfd8dc'
    },
    pdfName: { flex: 1, fontSize: 15, color: '#333' },
    pdfLabel: { marginLeft: 10, fontSize: 14, color: '#555' },
    emptyText: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 10 }
});
