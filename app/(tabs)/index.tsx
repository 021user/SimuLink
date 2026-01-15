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
    Switch,
    Platform,
    Animated
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';

// Polyfill pour window en React Native
if (typeof window === 'undefined') {
    global.window = global as any;
}

import { io } from 'socket.io-client';

// Détection automatique de l'IP
const getServerIP = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        return window.location?.hostname || 'localhost';
    }
    return '172.20.10.2';
};

const SERVER_IP = getServerIP();

const templates = {
    NFS: [
        { name: 'Leucocytes', unit: '10³/µL', value: '', reference: '4,00-10,00' },
        { name: 'Hémoglobines', unit: 'g/dL', value: '', reference: '11,5-16,0' },
        { name: 'Hématocrites', unit: '%', value: '', reference: '30,0-47,0' },
        { name: 'VGM', unit: 'fL', value: '', reference: '80-100' },
        { name: 'Plaquette', unit: '10³/µL', value: '', reference: '150-400' },
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
        { name: 'ASAT', unit: 'UI/L', value: '', reference: '<35' },
        { name: 'ALAT', unit: 'UI/L', value: '', reference: '<33' },
        { name: 'GGT', unit: 'UI/L', value: '', reference: '<20' },
        { name: 'PAL', unit: 'UI/L', value: '', reference: '<140' },
    ],
    Hémostase: [
        { name: 'TP', unit: '%', value: '', reference: '70-100' },
        { name: 'TCA', unit: 'ratio', value: '', reference: '0.8-1.2' },
        { name: 'Fibrinogène', unit: 'g/L', value: '', reference: '2-4' },
    ],
    'GAZ du sang': [
        { name: 'pH', unit: '', value: '', reference: '7.35-7.45' },
        { name: 'PaO2', unit: 'mmHg', value: '', reference: '90-100' },
        { name: 'PaCO2', unit: 'mmHg', value: '', reference: '35-45' },
        { name: 'CO2 total', unit: 'mmol/L', value: '', reference: '20-35' },
        { name: 'Bicarbonates', unit: 'mmol/L', value: '', reference: '22-26' },
        { name: 'SaO2', unit: '%', value: '', reference: '95-100' },
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

    const [pdfVisibility, setPdfVisibility] = useState<Record<string, boolean>>({});

    // États Hemocue pour envoi vers simulation
    const [hemoglobin, setHemoglobin] = useState('');
    const [hematocrit, setHematocrit] = useState('');

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
            const allR = await fetch(
                `http://${SERVER_IP}:5000/list-pdfs-in-folder/${selectedFolder}`
            );
            const all: string[] = await allR.json();
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
                Alert.alert('✓ Succès', js.message);
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
                Alert.alert('✓ Succès', 'Le rapport a été généré avec succès');
                fetchPDFList();
                setReportName('');
                setReportDate('');
                setAnalysisName('');
                setAnalysisUnit('');
                setAnalysisValue('');
                setAnalysesList([]);
                setSelectedTemplate('');
            }
        } catch {
            Alert.alert('Erreur', 'Échec de la génération du rapport');
        }
    }

    function addAnalysis() {
        if (!analysisName || !analysisUnit || !analysisValue) {
            return Alert.alert('Erreur', 'Veuillez remplir tous les champs de l\'analyse');
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
        setPdfVisibility(prev => ({ ...prev, [file]: next }));
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
            setPdfVisibility(prev => ({ ...prev, [file]: !next }));
        }
    };

    // Envoyer les valeurs Hemocue vers l'écran de simulation
    const sendHemocueToSimulation = () => {
        if (!hemoglobin && !hematocrit) {
            return Alert.alert('Erreur', 'Veuillez entrer au moins une valeur');
        }

        const data = {
            hemoglobin: hemoglobin || null,
            hematocrit: hematocrit || null,
            timestamp: new Date().toISOString()
        };

        // Émettre via Socket.IO
        if (socket) {
            socket.emit('hemocue-update', data);
            Alert.alert('✓ Envoyé', 'Valeurs Hemocue envoyées vers l\'écran de simulation');

            // Reset des champs
            setHemoglobin('');
            setHematocrit('');
        } else {
            Alert.alert('Erreur', 'Connexion socket non établie');
        }
    };

    return (
        <View style={styles.container}>
            {/* Header avec effet gradient */}
            <View style={styles.headerGradient}>
                <View style={styles.headerContent}>
                    <MaterialIcons name="folder-shared" size={36} color="#fff" />
                    <Text style={styles.headerTitle}>Gestion Patients</Text>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Création de dossier */}
                <View style={[styles.card, styles.shadowCard]}>
                    <View style={styles.cardHeaderRow}>
                        <View style={styles.iconCircle}>
                            <MaterialIcons name="create-new-folder" size={24} color="#667eea" />
                        </View>
                        <Text style={styles.cardTitle}>Nouveau Dossier</Text>
                    </View>
                    <View style={styles.inputRow}>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                placeholder="Nom du dossier patient"
                                value={newFolderName}
                                onChangeText={setNewFolderName}
                                style={styles.modernInput}
                                placeholderTextColor="#aaa"
                            />
                        </View>
                        <TouchableOpacity onPress={addPatientFolder} style={styles.addButtonCircle}>
                            <MaterialIcons name="add" size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Liste dossiers */}
                <View style={[styles.card, styles.shadowCard]}>
                    <View style={styles.cardHeaderRow}>
                        <View style={styles.iconCircle}>
                            <MaterialIcons name="folder-open" size={24} color="#667eea" />
                        </View>
                        <Text style={styles.cardTitle}>Dossiers Patients</Text>
                    </View>
                    <FlatList
                        data={patientFolders}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(_, i) => i.toString()}
                        contentContainerStyle={styles.folderListContainer}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => setSelectedFolder(item)}
                                style={[
                                    styles.folderPill,
                                    selectedFolder === item && styles.folderPillSelected
                                ]}
                                activeOpacity={0.7}
                            >
                                <MaterialIcons
                                    name={selectedFolder === item ? "folder-open" : "folder"}
                                    size={22}
                                    color={selectedFolder === item ? '#fff' : '#667eea'}
                                />
                                <Text style={[
                                    styles.folderPillText,
                                    selectedFolder === item && styles.folderPillTextSelected
                                ]}>
                                    {item}
                                </Text>
                                {selectedFolder === item && (
                                    <View style={styles.checkBadge}>
                                        <MaterialIcons name="check" size={14} color="#fff" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>Aucun dossier</Text>
                        }
                    />
                </View>

                {/* Rapport Médical */}
                <View style={[styles.card, styles.shadowCard]}>
                    <View style={styles.cardHeaderRow}>
                        <View style={styles.iconCircle}>
                            <MaterialIcons name="description" size={24} color="#667eea" />
                        </View>
                        <Text style={styles.cardTitle}>Nouveau Rapport</Text>
                    </View>
                    <View style={styles.inputWrapper}>
                        <MaterialIcons name="edit" size={20} color="#999" style={styles.inputIcon} />
                        <TextInput
                            placeholder="Nom du rapport"
                            value={reportName}
                            onChangeText={setReportName}
                            style={styles.modernInput}
                            placeholderTextColor="#aaa"
                        />
                    </View>
                    <View style={styles.inputWrapper}>
                        <MaterialIcons name="event" size={20} color="#999" style={styles.inputIcon} />
                        <TextInput
                            placeholder="Date (YYYY-MM-DD)"
                            value={reportDate}
                            onChangeText={setReportDate}
                            style={styles.modernInput}
                            placeholderTextColor="#aaa"
                        />
                    </View>
                </View>

                {/* Template */}
                <View style={[styles.card, styles.shadowCard]}>
                    <View style={styles.cardHeaderRow}>
                        <View style={styles.iconCircle}>
                            <MaterialIcons name="ballot" size={24} color="#667eea" />
                        </View>
                        <Text style={styles.cardTitle}>Template d'Analyse</Text>
                    </View>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={selectedTemplate}
                            onValueChange={applyTemplate}
                            style={styles.modernPicker}
                        >
                            <Picker.Item label="Choisir un template..." value="" />
                            {Object.keys(templates).map(key => (
                                <Picker.Item key={key} label={key} value={key} />
                            ))}
                        </Picker>
                    </View>
                </View>

                {/* Ajout d'analyse */}
                <View style={[styles.card, styles.shadowCard]}>
                    <View style={styles.cardHeaderRow}>
                        <View style={styles.iconCircle}>
                            <MaterialIcons name="science" size={24} color="#667eea" />
                        </View>
                        <Text style={styles.cardTitle}>Ajouter une Analyse</Text>
                    </View>
                    <View style={styles.analysisInputGrid}>
                        <View style={[styles.inputWrapper, styles.gridInput]}>
                            <TextInput
                                placeholder="Nom"
                                value={analysisName}
                                onChangeText={setAnalysisName}
                                style={styles.modernInput}
                                placeholderTextColor="#aaa"
                            />
                        </View>
                        <View style={[styles.inputWrapper, styles.gridInput]}>
                            <TextInput
                                placeholder="Unité"
                                value={analysisUnit}
                                onChangeText={setAnalysisUnit}
                                style={styles.modernInput}
                                placeholderTextColor="#aaa"
                            />
                        </View>
                        <View style={[styles.inputWrapper, styles.gridInput]}>
                            <TextInput
                                placeholder="Valeur"
                                value={analysisValue}
                                onChangeText={setAnalysisValue}
                                style={styles.modernInput}
                                placeholderTextColor="#aaa"
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                    <TouchableOpacity onPress={addAnalysis} style={styles.modernButton}>
                        <MaterialIcons name="add-circle-outline" size={22} color="#fff" />
                        <Text style={styles.modernButtonText}>Ajouter l'analyse</Text>
                    </TouchableOpacity>
                </View>

                {/* Liste des analyses */}
                {analysesList.length > 0 && (
                    <View style={[styles.card, styles.shadowCard]}>
                        <View style={styles.cardHeaderRow}>
                            <View style={styles.iconCircle}>
                                <MaterialIcons name="list-alt" size={24} color="#667eea" />
                            </View>
                            <Text style={styles.cardTitle}>Analyses</Text>
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>{analysesList.length}</Text>
                            </View>
                        </View>
                        {analysesList.map((item, idx) => (
                            <View key={idx} style={styles.analysisCard}>
                                <View style={styles.analysisContent}>
                                    <Text style={styles.analysisNameText}>{item.name}</Text>
                                    <Text style={styles.analysisSubText}>
                                        {item.unit} • Norme: {item.reference}
                                    </Text>
                                </View>
                                <TextInput
                                    style={styles.analysisValueInput}
                                    value={item.value}
                                    onChangeText={v => {
                                        const c = [...analysesList];
                                        c[idx].value = v;
                                        setAnalysesList(c);
                                    }}
                                    keyboardType="numeric"
                                    placeholder="Val."
                                    placeholderTextColor="#aaa"
                                />
                                <TouchableOpacity
                                    onPress={() => removeAnalysis(idx)}
                                    style={styles.deleteIconButton}
                                >
                                    <MaterialIcons name="close" size={22} color="#ff6b6b" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {/* Section Hemocue - Envoi vers simulation */}
                <View style={[styles.card, styles.shadowCard, styles.hemocueCard]}>
                    <View style={styles.cardHeaderRow}>
                        <View style={[styles.iconCircle, { backgroundColor: '#ffe5e5' }]}>
                            <MaterialIcons name="bloodtype" size={24} color="#ff6b6b" />
                        </View>
                        <Text style={[styles.cardTitle, { color: '#ff6b6b' }]}>
                            Envoyer Hemocue vers Simulation
                        </Text>
                    </View>

                    <View style={styles.hemocueGrid}>
                        <View style={styles.hemocueInputBox}>
                            <Text style={styles.hemocueLabel}>Hémoglobine (g/dL)</Text>
                            <TextInput
                                placeholder="14.5"
                                value={hemoglobin}
                                onChangeText={setHemoglobin}
                                style={styles.hemocueInput}
                                placeholderTextColor="#ccc"
                                keyboardType="decimal-pad"
                            />
                        </View>

                        <View style={styles.hemocueInputBox}>
                            <Text style={styles.hemocueLabel}>Hématocrite (%)</Text>
                            <TextInput
                                placeholder="42"
                                value={hematocrit}
                                onChangeText={setHematocrit}
                                style={styles.hemocueInput}
                                placeholderTextColor="#ccc"
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={sendHemocueToSimulation}
                        style={styles.hemocueButton}
                        activeOpacity={0.8}
                    >
                        <MaterialIcons name="send" size={22} color="#fff" />
                        <Text style={styles.modernButtonText}>Envoyer vers écran Hemocue</Text>
                    </TouchableOpacity>
                </View>

                {/* Toggle Publication */}
                <View style={[styles.card, styles.shadowCard]}>
                    <View style={styles.toggleContainer}>
                        <View style={styles.toggleLeft}>
                            <View style={[styles.iconCircle, { backgroundColor: '#e8f5e9' }]}>
                                <MaterialIcons name="visibility" size={24} color="#4caf50" />
                            </View>
                            <Text style={styles.toggleText}>Publier en Réception</Text>
                        </View>
                        <Switch
                            value={publishToReception}
                            onValueChange={setPublishToReception}
                            trackColor={{ true: '#667eea', false: '#ddd' }}
                            thumbColor="#fff"
                        />
                    </View>
                </View>

                {/* Bouton Générer */}
                <TouchableOpacity
                    onPress={generateReportInFolder}
                    style={[
                        styles.generateButton,
                        (!selectedFolder || analysesList.length === 0) && styles.generateButtonDisabled
                    ]}
                    disabled={!selectedFolder || analysesList.length === 0}
                    activeOpacity={0.8}
                >
                    <MaterialIcons name="picture-as-pdf" size={26} color="#fff" />
                    <Text style={styles.generateButtonText}>Générer le Rapport PDF</Text>
                </TouchableOpacity>

                {/* Liste des PDFs */}
                {selectedFolder && (
                    <View style={[styles.card, styles.shadowCard]}>
                        <View style={styles.cardHeaderRow}>
                            <View style={styles.iconCircle}>
                                <MaterialIcons name="library-books" size={24} color="#667eea" />
                            </View>
                            <Text style={styles.cardTitle}>Documents</Text>
                        </View>
                        {pdfList.length === 0 ? (
                            <View style={styles.emptyStateContainer}>
                                <MaterialIcons name="insert-drive-file" size={56} color="#e0e0e0" />
                                <Text style={styles.emptyStateText}>Aucun document</Text>
                            </View>
                        ) : (
                            pdfList.map(file => (
                                <View key={file} style={styles.pdfCard}>
                                    <View style={styles.pdfIconCircle}>
                                        <MaterialIcons name="picture-as-pdf" size={24} color="#ff6b6b" />
                                    </View>
                                    <Text style={styles.pdfFileName}>{file}</Text>
                                    <View style={styles.pdfToggle}>
                                        <Switch
                                            value={!!pdfVisibility[file]}
                                            onValueChange={() => togglePdfVisibility(file)}
                                            trackColor={{ true: '#4caf50', false: '#ddd' }}
                                            thumbColor="#fff"
                                        />
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}

                <View style={styles.footerInfo}>
                    <MaterialIcons name="dns" size={16} color="#999" />
                    <Text style={styles.footerText}>Serveur: {SERVER_IP}</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fd',
    },
    headerGradient: {
        backgroundColor: '#667eea',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        marginLeft: 12,
        letterSpacing: 0.5,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
    },
    shadowCard: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f0f3ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2d3748',
        flex: 1,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f7f8fc',
        borderRadius: 16,
        paddingHorizontal: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    inputIcon: {
        marginRight: 10,
    },
    modernInput: {
        flex: 1,
        height: 52,
        fontSize: 16,
        color: '#2d3748',
        fontWeight: '500',
    },
    addButtonCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#667eea',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    folderListContainer: {
        paddingVertical: 8,
    },
    folderPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f3ff',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 25,
        marginRight: 10,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    folderPillSelected: {
        backgroundColor: '#667eea',
        borderColor: '#5a67d8',
    },
    folderPillText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#667eea',
        marginLeft: 8,
    },
    folderPillTextSelected: {
        color: '#fff',
    },
    checkBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    pickerWrapper: {
        backgroundColor: '#f7f8fc',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    modernPicker: {
        height: 52,
    },
    analysisInputGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    gridInput: {
        width: '32%',
    },
    modernButton: {
        flexDirection: 'row',
        backgroundColor: '#667eea',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    modernButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        marginLeft: 8,
    },
    analysisCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f7f8fc',
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
    },
    analysisContent: {
        flex: 1,
    },
    analysisNameText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2d3748',
        marginBottom: 4,
    },
    analysisSubText: {
        fontSize: 13,
        color: '#718096',
    },
    analysisValueInput: {
        width: 80,
        height: 44,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 12,
        fontSize: 16,
        fontWeight: '600',
        color: '#2d3748',
        textAlign: 'center',
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#e2e8f0',
    },
    deleteIconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#ffe5e5',
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    toggleText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#2d3748',
        marginLeft: 12,
    },
    generateButton: {
        flexDirection: 'row',
        backgroundColor: '#48bb78',
        paddingVertical: 20,
        paddingHorizontal: 32,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: '#48bb78',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 6,
    },
    generateButtonDisabled: {
        backgroundColor: '#a0aec0',
        shadowOpacity: 0,
        elevation: 0,
    },
    generateButtonText: {
        color: '#fff',
        fontSize: 19,
        fontWeight: '800',
        marginLeft: 12,
        letterSpacing: 0.5,
    },
    pdfCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f7f8fc',
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
    },
    pdfIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#ffe5e5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    pdfFileName: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#2d3748',
    },
    pdfToggle: {
        marginLeft: 12,
    },
    emptyText: {
        fontSize: 15,
        color: '#a0aec0',
        textAlign: 'center',
        paddingVertical: 20,
    },
    emptyStateContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#a0aec0',
        marginTop: 16,
        fontWeight: '500',
    },
    countBadge: {
        backgroundColor: '#667eea',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    countText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    footerText: {
        fontSize: 13,
        color: '#a0aec0',
        marginLeft: 8,
        fontWeight: '500',
    },
    hemocueCard: {
        borderWidth: 2,
        borderColor: '#ffe5e5',
    },
    hemocueGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    hemocueInputBox: {
        flex: 1,
        backgroundColor: '#fff5f5',
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderColor: '#ffe5e5',
    },
    hemocueLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#ff6b6b',
        marginBottom: 8,
    },
    hemocueInput: {
        fontSize: 24,
        fontWeight: '800',
        color: '#2d3748',
        textAlign: 'center',
        paddingVertical: 8,
    },
    hemocueButton: {
        flexDirection: 'row',
        backgroundColor: '#ff6b6b',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#ff6b6b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
});