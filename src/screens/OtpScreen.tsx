import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Easing,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {verifyOtpApi} from '../api/auth';

// ─── Types ────────────────────────────────────────────────────────────────────
type Props = {
  whatsappUrl: string;
  onVerified: (fullname: string) => void;
  onBack: () => void;
};

// ─── OTP Input Cell ───────────────────────────────────────────────────────────
const OtpCell = ({
  value,
  focused,
}: {
  value: string;
  focused: boolean;
}) => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (focused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {toValue: 1.08, duration: 500, useNativeDriver: true}),
          Animated.timing(pulse, {toValue: 1, duration: 500, useNativeDriver: true}),
        ]),
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
    }
  }, [focused, pulse]);

  return (
    <Animated.View
      style={[
        styles.otpCell,
        focused && styles.otpCellFocused,
        {transform: [{scale: pulse}]},
      ]}>
      <Text style={styles.otpCellText}>{value || (focused ? '|' : '')}</Text>
    </Animated.View>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function OtpScreen({whatsappUrl, onVerified, onBack}: Props) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputRef = useRef<TextInput>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {toValue: 12, duration: 60, easing: Easing.linear, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: -12, duration: 60, easing: Easing.linear, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: 12, duration: 60, easing: Easing.linear, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: 0, duration: 60, easing: Easing.linear, useNativeDriver: true}),
    ]).start();
  };

  const openWhatsApp = () => {
    if (whatsappUrl) {
      Linking.openURL(whatsappUrl).catch(() =>
        setError('Could not open WhatsApp. Please install it and try again.'),
      );
    }
  };

  const handleVerify = async () => {
    if (!otp.trim() || otp.length < 4) {
      setError('Please enter the OTP you received.');
      shake();
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await verifyOtpApi(otp.trim());
      if (res.status === 'success') {
        setSuccess(res.message);
        setTimeout(() => {
          const fullname = res.message
            .replace('Welcome ', '')
            .replace('!', '')
            .trim();
          onVerified(fullname);
        }, 800);
      } else {
        setError(res.message || 'OTP verification failed.');
        shake();
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Network error. Please check your connection.';
      setError(msg);
      shake();
    } finally {
      setLoading(false);
    }
  };

  const otpDigits = otp.split('').slice(0, 6);
  while (otpDigits.length < 6) {
    otpDigits.push('');
  }

  return (
    <LinearGradient
      colors={['#0f0c29', '#302b63', '#24243e']}
      style={styles.gradient}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0c29" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">

          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>← Back to Login</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.whatsappBadge}>
              <Text style={styles.whatsappIcon}>💬</Text>
            </View>
            <Text style={styles.title}>WhatsApp OTP Verification</Text>
            <Text style={styles.subtitle}>
              Two-factor authentication required
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Step 1 */}
            <View style={styles.step}>
              <View style={styles.stepNumBadge}>
                <Text style={styles.stepNum}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Open WhatsApp</Text>
                <Text style={styles.stepDesc}>
                  Tap the button below to open WhatsApp and send the authentication message.
                </Text>
                <TouchableOpacity
                  style={styles.whatsappBtn}
                  onPress={openWhatsApp}
                  activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#25d366', '#128c7e']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.whatsappBtnGradient}>
                    <Text style={styles.whatsappBtnText}>
                      💬  Open WhatsApp
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Step 2 */}
            <View style={styles.step}>
              <View style={styles.stepNumBadge}>
                <Text style={styles.stepNum}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Enter OTP</Text>
                <Text style={styles.stepDesc}>
                  Enter the OTP code you receive on WhatsApp below.
                </Text>

                {/* OTP Cells */}
                <Animated.View
                  style={[
                    styles.otpContainer,
                    {transform: [{translateX: shakeAnim}]},
                  ]}>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => inputRef.current?.focus()}>
                    <View style={styles.otpRow} pointerEvents="none">
                      {otpDigits.map((digit, i) => (
                        <OtpCell
                          key={i}
                          value={digit}
                          focused={i === otp.length && otp.length < 6}
                        />
                      ))}
                    </View>
                  </TouchableOpacity>
                  <TextInput
                    ref={inputRef}
                    value={otp}
                    onChangeText={v => {
                      const cleaned = v.replace(/[^0-9]/g, '').slice(0, 6);
                      setOtp(cleaned);
                      setError('');
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    style={styles.hiddenInput}
                    autoFocus
                  />
                </Animated.View>

                {/* Error */}
                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* Success */}
                {success ? (
                  <View style={styles.successBox}>
                    <Text style={styles.successIcon}>✅</Text>
                    <Text style={styles.successText}>{success}</Text>
                  </View>
                ) : null}

                {/* Verify Button */}
                <TouchableOpacity
                  style={[styles.verifyBtn, loading && styles.verifyBtnDisabled]}
                  onPress={handleVerify}
                  disabled={loading}
                  activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.verifyBtnGradient}>
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.verifyBtnText}>Verify & Login →</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Note */}
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              🕐 OTP is valid for 5 minutes only.{'\n'}
              📱 Make sure WhatsApp is installed on your device.
            </Text>
          </View>

          <Text style={styles.footer}>
            © 2025 Shroitele Infrastructure Pvt. Ltd.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: {flex: 1},
  gradient: {flex: 1},
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Back
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 24,
  },
  backBtnText: {color: '#667eea', fontSize: 15, fontWeight: '600'},

  // Header
  header: {alignItems: 'center', marginBottom: 28},
  whatsappBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(37, 211, 102, 0.15)',
    borderWidth: 2,
    borderColor: '#25d366',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  whatsappIcon: {fontSize: 32},
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#8a8fa8',
    marginTop: 6,
    textAlign: 'center',
  },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  // Steps
  step: {flexDirection: 'row', alignItems: 'flex-start'},
  stepNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    marginTop: 2,
    flexShrink: 0,
  },
  stepNum: {color: '#fff', fontSize: 13, fontWeight: '700'},
  stepContent: {flex: 1},
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: 13,
    color: '#8a8fa8',
    lineHeight: 20,
    marginBottom: 16,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 20,
  },

  // WhatsApp button
  whatsappBtn: {borderRadius: 12, overflow: 'hidden'},
  whatsappBtnGradient: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappBtnText: {color: '#fff', fontSize: 15, fontWeight: '700'},

  // OTP
  otpContainer: {marginBottom: 16},
  otpRow: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4},
  otpCell: {
    width: 44,
    height: 54,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpCellFocused: {
    borderColor: '#667eea',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  otpCellText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },

  // Error / Success
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorIcon: {fontSize: 14, marginRight: 8},
  errorText: {color: '#fca5a5', fontSize: 13, flex: 1},

  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  successIcon: {fontSize: 14, marginRight: 8},
  successText: {color: '#86efac', fontSize: 13, flex: 1},

  // Verify Button
  verifyBtn: {borderRadius: 12, overflow: 'hidden'},
  verifyBtnDisabled: {opacity: 0.7},
  verifyBtnGradient: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Note
  noteBox: {
    marginTop: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.15)',
  },
  noteText: {color: '#a5b4fc', fontSize: 12, lineHeight: 20},

  // Footer
  footer: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 28,
  },
});
