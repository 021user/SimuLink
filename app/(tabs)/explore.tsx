import { StyleSheet, View, Text } from 'react-native';

export default function ReceptionScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Réception</Text>
            <Text>Bienvenue sur l'écran de réception.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
});
