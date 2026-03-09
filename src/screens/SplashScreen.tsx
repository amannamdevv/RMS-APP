import { StyleSheet, Text, View } from 'react-native';
import React, { useEffect } from 'react';
import * as Animatable from 'react-native-animatable';

// 1. Import React Navigation types
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App'; // Adjust this path if your App.tsx is in a different folder

// 2. Map the Props to your Navigation Stack
type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const SplashScreen = ({ navigation }: Props) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      // 3. Use navigation.replace to go to the login screen
      navigation.replace('Login'); 
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Animatable.Image
        source={require('../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
        duration={2000}
        animation="zoomIn"
      />
      <Animatable.Text
        style={styles.text}
        duration={2000}
        animation="bounceInDown"
      >
        {'Welcome to Shroti Telecom \nPvt Ltd'}
      </Animatable.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    height: 150,
    width: 150,
  },
  text: {
    color: '#02006B',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default SplashScreen;