import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useAuth } from '../context/AuthContext'
import { COLORS } from '../theme'
import { Ionicons } from '@expo/vector-icons'
import { BASE_URL } from '../api/api'

export default function ProfileScreen() {
  const { user, logout } = useAuth()

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout }
    ])
  }

  const MenuRow = ({ icon, label, value, color, onPress, showArrow = true }) => (
    <TouchableOpacity onPress={onPress} style={styles.menuRow} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: (color || COLORS.primary) + '20' }]}>
        <Ionicons name={icon} size={18} color={color || COLORS.primary} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <View style={styles.menuRight}>
        {value && <Text style={styles.menuValue}>{value}</Text>}
        {showArrow && <Ionicons name="chevron-forward" size={14} color="#ccc" />}
      </View>
    </TouchableOpacity>
  )

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {(user?.first_name || user?.username || 'U')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.profileName}>
          {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username}
        </Text>
        <Text style={styles.profileUsername}>@{user?.username}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.is_staff ? '⭐ Admin' : '🌲 Trader'}</Text>
        </View>
      </View>

      {/* Account Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          <MenuRow icon="person-outline" label="Username" value={user?.username} showArrow={false} />
          <MenuRow icon="mail-outline" label="Email" value={user?.email || 'Not set'} showArrow={false} />
          <MenuRow icon="shield-outline" label="Role" value={user?.is_staff ? 'Administrator' : 'Trader'} color={user?.is_staff ? COLORS.warning : COLORS.primary} showArrow={false} />
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>
        <View style={styles.menuCard}>
          <MenuRow icon="server-outline" label="Backend URL" value={BASE_URL.replace('/api', '')} showArrow={false} />
          <MenuRow icon="information-circle-outline" label="App Version" value="1.0.0" showArrow={false} />
        </View>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>WoodTrack v1.0 · Wood Trading Management</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  profileHeader: { backgroundColor: COLORS.primary, alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 32 },
  profileName: { color: '#fff', fontSize: 20, fontWeight: '700' },
  profileUsername: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, marginTop: 10 },
  roleText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  section: { padding: 16, paddingBottom: 0 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  menuCard: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  menuIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 14, color: COLORS.text },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuValue: { fontSize: 12, color: COLORS.textMuted, maxWidth: 160 },
  logoutBtn: { backgroundColor: COLORS.danger, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: { textAlign: 'center', color: COLORS.textLight, fontSize: 11, margin: 24 },
})
