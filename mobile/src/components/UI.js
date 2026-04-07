import React from 'react'
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, TextInput
} from 'react-native'
import { COLORS, SHADOWS } from '../theme'

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style }) {
  return (
    <View style={[styles.card, style]}>{children}</View>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[styles.statCard, { borderLeftColor: color }]}
    >
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </TouchableOpacity>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ label, bg, color }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ title, onPress, color = COLORS.primary, outlined, loading, style, small }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        small && styles.buttonSmall,
        outlined
          ? { backgroundColor: '#fff', borderWidth: 1.5, borderColor: color }
          : { backgroundColor: color },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={outlined ? color : '#fff'} size="small" />
        : <Text style={[styles.buttonText, outlined && { color }]}>{title}</Text>
      }
    </TouchableOpacity>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, style, ...props }) {
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        style={[styles.input, error && { borderColor: COLORS.danger }]}
        placeholderTextColor="#aaa"
        {...props}
      />
      {error && <Text style={styles.inputError}>{error}</Text>}
    </View>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────
export function SectionHeader({ title, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
    </View>
  )
}

// ── Loading ───────────────────────────────────────────────────────────────────
export function LoadingScreen() {
  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={{ color: COLORS.textMuted, marginTop: 12, fontSize: 14 }}>Loading...</Text>
    </View>
  )
}

// ── Row Item ──────────────────────────────────────────────────────────────────
export function RowItem({ title, subtitle, right, onPress, leftIcon }) {
  const Wrapper = onPress ? TouchableOpacity : View
  return (
    <Wrapper onPress={onPress} activeOpacity={0.7} style={styles.rowItem}>
      {leftIcon && (
        <View style={styles.rowLeftIcon}>
          <Text style={{ fontSize: 18 }}>{leftIcon}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
      </View>
      {right && <View style={styles.rowRight}>{right}</View>}
    </Wrapper>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  statCard: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    flex: 1,
    ...SHADOWS.small,
  },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statSub: { fontSize: 10, color: COLORS.textLight, marginTop: 2 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { paddingVertical: 7, paddingHorizontal: 14 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: '#fff',
  },
  inputError: { fontSize: 11, color: COLORS.danger, marginTop: 4 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  sectionAction: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textMuted },
  emptySub: { fontSize: 13, color: COLORS.textLight, marginTop: 4, textAlign: 'center' },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  rowLeftIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTitle: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  rowSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  rowRight: { marginLeft: 8 },
})
