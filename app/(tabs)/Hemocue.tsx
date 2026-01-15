import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
    Animated
} from 'react-native';
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

interface HemocueData {
    hemoglobin: string | null;
    hematocrit: string | null;
    timestamp: string;
}

export default function HemocueScreen() {
    const [socket, setSocket] = useState<any>(null);
    const [hemocueData, setHemocueData] = useState<HemocueData | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [pulseAnim] = useState(new Animated.Value(1));

    useEffect(() => {
        const s = io(`http://${SERVER_IP}:5000`);
        setSocket(s);

        s.on('connect', () => {
            console.log('✓ Connecté au serveur Hemocue');
            setIsConnected(true);
        });

        s.on('disconnect', () => {
            console.log('✗ Déconnecté du serveur');
            setIsConnected(false);
        });

        // Écouter les mises à jour Hemocue
        s.on('hemocue-update', (data: HemocueData) => {
            console.log('Hemocue reçu:', data);
            setHemocueData(data);

            // Animation de pulse
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        });

        return () => s.disconnect();
    }, []);

    const getHbStatus = (value: string | null) => {
        if (!value) return { color: '#a0aec0', status: 'En attente', icon: 'hourglass-empty' };
        const val = parseFloat(value);
        if (val < 12) return { color: '#ff6b6b', status: 'BAS', icon: 'arrow-downward' };
        if (val > 17) return { color: '#ff6b6b', status: 'HAUT', icon: 'arrow-upward' };
        return { color: '#48bb78', status: 'NORMAL', icon: 'check-circle' };
    };

    const getHtStatus = (value: string | null) => {
        if (!value) return { color: '#a0aec0', status: 'En attente', icon: 'hourglass-empty' };
        const val = parseFloat(value);
        if (val < 36) return { color: '#ff6b6b', status: 'BAS', icon: 'arrow-downward' };
        if (val > 53) return { color: '#ff6b6b', status: 'HAUT', icon: 'arrow-upward' };
        return { color: '#48bb78', status: 'NORMAL', icon: 'check-circle' };
    };

    const hbStatus = getHbStatus(hemocueData?.hemoglobin || null);
    const htStatus = getHtStatus(hemocueData?.hematocrit || null);

    return (
        <View style={styles.container}>
            {/* Header avec statut connexion */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <MaterialIcons name="bloodtype" size={40} color="#fff" />
                    <Text style={styles.headerTitle}>HEMOCUE</Text>
                    <View style={[styles.connectionBadge, isConnected && styles.connected]}>
                        <View style={[styles.connectionDot, isConnected && styles.connectedDot]} />
                        <Text style={styles.connectionText}>
                            {isConnected ? 'CONNECTÉ' : 'DÉCONNECTÉ'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.headerSubtitle}>Analyseur Hématologique</Text>
            </View>

            <View style={styles.content}>
                {/* Status général */}
                <View style={styles.statusCard}>
                    <MaterialIcons
                        name={hemocueData ? "check-circle" : "pending"}
                        size={32}
                        color={hemocueData ? "#48bb78" : "#ffd93d"}
                    />
                    <Text style={styles.statusText}>
                        {hemocueData ? 'RÉSULTATS DISPONIBLES' : 'EN ATTENTE DE MESURE'}
                    </Text>
                </View>

                {/* Grille des résultats */}
                <View style={styles.resultsGrid}>
                    {/* Hémoglobine */}
                    <Animated.View
                        style={[
                            styles.resultCard,
                            { transform: [{ scale: pulseAnim }] }
                        ]}
                    >
                        <View style={styles.resultHeader}>
                            <MaterialIcons name="opacity" size={28} color="#ff6b6b" />
                            <Text style={styles.resultTitle}>HÉMOGLOBINE</Text>
                        </View>

                        <View style={styles.resultValueContainer}>
                            {hemocueData?.hemoglobin ? (
                                <>
                                    <Text style={[styles.resultValue, { color: hbStatus.color }]}>
                                        {hemocueData.hemoglobin}
                                    </Text>
                                    <Text style={styles.resultUnit}>g/dL</Text>
                                </>
                            ) : (
                                <Text style={styles.resultPlaceholder}>--.-</Text>
                            )}
                        </View>

                        <View style={[styles.statusBadge, { backgroundColor: hbStatus.color + '20' }]}>
                            <MaterialIcons name={hbStatus.icon as any} size={18} color={hbStatus.color} />
                            <Text style={[styles.statusBadgeText, { color: hbStatus.color }]}>
                                {hbStatus.status}
                            </Text>
                        </View>

                        <Text style={styles.referenceRange}>
                            Norme: 12,0 - 17,0 g/dL
                        </Text>
                    </Animated.View>

                    {/* Hématocrite */}
                    <Animated.View
                        style={[
                            styles.resultCard,
                            { transform: [{ scale: pulseAnim }] }
                        ]}
                    >
                        <View style={styles.resultHeader}>
                            <MaterialIcons name="water-drop" size={28} color="#667eea" />
                            <Text style={styles.resultTitle}>HÉMATOCRITE</Text>
                        </View>

                        <View style={styles.resultValueContainer}>
                            {hemocueData?.hematocrit ? (
                                <>
                                    <Text style={[styles.resultValue, { color: htStatus.color }]}>
                                        {hemocueData.hematocrit}
                                    </Text>
                                    <Text style={styles.resultUnit}>%</Text>
                                </>
                            ) : (
                                <Text style={styles.resultPlaceholder}>--</Text>
                            )}
                        </View>

                        <View style={[styles.statusBadge, { backgroundColor: htStatus.color + '20' }]}>
                            <MaterialIcons name={htStatus.icon as any} size={18} color={htStatus.color} />
                            <Text style={[styles.statusBadgeText, { color: htStatus.color }]}>
                                {htStatus.status}
                            </Text>
                        </View>

                        <Text style={styles.referenceRange}>
                            Norme: 36 - 53 %
                        </Text>
                    </Animated.View>
                </View>

                {/* Informations supplémentaires */}
                {hemocueData && (
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <MaterialIcons name="access-time" size={20} color="#667eea" />
                            <Text style={styles.infoText}>
                                Dernière mesure: {new Date(hemocueData.timestamp).toLocaleString('fr-FR')}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <MaterialIcons name="verified" size={20} color="#48bb78" />
                            <Text style={styles.infoText}>
                                Résultats validés
                            </Text>
                        </View>
                    </View>
                )}

                {/* Instructions */}
                {!hemocueData && (
                    <View style={styles.instructionsCard}>
                        <MaterialIcons name="info-outline" size={28} color="#667eea" />
                        <Text style={styles.instructionsTitle}>En attente de mesure</Text>
                        <Text style={styles.instructionsText}>
                            Les valeurs s'afficheront automatiquement lorsque le régisseur enverra une mesure Hemocue
                        </Text>
                    </View>
                )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <MaterialIcons name="dns" size={16} color="#a0aec0" />
                <Text style={styles.footerText}>Serveur: {SERVER_IP}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f1419',
    },
    header: {
        backgroundColor: '#ff6b6b',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 24,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: '#ff6b6b',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    headerTitle: {
        flex: 1,
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 2,
        marginLeft: 12,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
        letterSpacing: 1,
    },
    connectionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    connected: {
        backgroundColor: 'rgba(72,187,120,0.3)',
    },
    connectionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
        marginRight: 6,
    },
    connectedDot: {
        backgroundColor: '#48bb78',
    },
    connectionText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.5,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1f27',
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#2d3748',
    },
    statusText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        marginLeft: 16,
        letterSpacing: 0.5,
    },
    resultsGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 20,
    },
    resultCard: {
        flex: 1,
        backgroundColor: '#1a1f27',
        padding: 24,
        borderRadius: 24,
        borderWidth: 3,
        borderColor: '#2d3748',
        alignItems: 'center',
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    resultTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#fff',
        marginLeft: 8,
        letterSpacing: 1,
    },
    resultValueContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 16,
    },
    resultValue: {
        fontSize: 56,
        fontWeight: '900',
        letterSpacing: -2,
    },
    resultUnit: {
        fontSize: 20,
        fontWeight: '700',
        color: '#a0aec0',
        marginLeft: 8,
    },
    resultPlaceholder: {
        fontSize: 56,
        fontWeight: '900',
        color: '#2d3748',
        letterSpacing: -2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 12,
    },
    statusBadgeText: {
        fontSize: 14,
        fontWeight: '800',
        marginLeft: 6,
        letterSpacing: 0.5,
    },
    referenceRange: {
        fontSize: 12,
        color: '#718096',
        fontWeight: '600',
    },
    infoCard: {
        backgroundColor: '#1a1f27',
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#2d3748',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoText: {
        fontSize: 14,
        color: '#cbd5e0',
        marginLeft: 12,
        fontWeight: '600',
    },
    instructionsCard: {
        backgroundColor: '#1a1f27',
        padding: 32,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#2d3748',
        borderStyle: 'dashed',
    },
    instructionsTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        marginTop: 16,
        marginBottom: 8,
    },
    instructionsText: {
        fontSize: 14,
        color: '#a0aec0',
        textAlign: 'center',
        lineHeight: 22,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        backgroundColor: '#1a1f27',
    },
    footerText: {
        fontSize: 12,
        color: '#718096',
        marginLeft: 8,
        fontWeight: '600',
    },
});