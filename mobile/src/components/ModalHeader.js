import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../theme'

export default function ModalHeader({ title, onClose }) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      backgroundColor: '#fff'
    }}>
      <Text style={{ fontSize: 16, fontWeight: '700' }}>
        {title}
      </Text>

      <TouchableOpacity
        onPress={onClose}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          justifyContent: 'center',
          alignItems: 'center'
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // 🔥 better touch
      >
        <Ionicons name="close" size={22} color={COLORS.text} />
      </TouchableOpacity>
    </View>
  )
}