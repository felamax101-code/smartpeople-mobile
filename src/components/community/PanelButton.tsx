








import { Pressable, Text,View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
interface PanelButtonProps {
  label: string;
  info?:string
  onPress: () => void;
}

export function PanelButton({ label,info, onPress }: PanelButtonProps) {
    const theme=useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed,{backgroundColor:theme.background,borderColor:theme.textMuted}]}
    >
        <View>
      <Text style={[styles.label,{color:theme.textPrimary}]}>{label}</Text>
      <Text style={[styles.info,{color:theme.textMuted}]}>{info}</Text>
      </View>
      <Text style={[styles.chevron,{color:theme.textPrimary}]}>{'\u203A'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    elevation:20
  },
  buttonPressed: {
    backgroundColor: '#f5f5f5',
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },


  info: {
    fontSize: 10,
    fontWeight: '400',
    fontStyle:"italic",
  },
  chevron: {
    fontSize: 18,
  },
});

