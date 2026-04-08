<<<<<<< HEAD
import Config from 'react-native-config';

export const config = {
  apiUrl: Config.API_URL,
};
=======
// import Config from 'react-native-config';

export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL,
};
>>>>>>> origin/main
