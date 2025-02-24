// notifications.js
import { Alert } from 'react-native';

export const sendNotification = (title, message) => {
    Alert.alert(title, message);
};
