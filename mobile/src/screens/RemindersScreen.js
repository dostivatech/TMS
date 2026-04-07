import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { invoiceAPI, fmt } from '../api/api'
import { Card, LoadingScreen } from '../components/UI'
import { COLORS } from '../theme'
import { Ionicons } from '@expo/vector-icons'

export default function RemindersScreen() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [days, setDays] = useState(7)
  const navigation = useNavigation()

  const load = async () => {
    try {
      const { data: d } = await invoiceAPI.reminders(days)
      setData(d)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [days])

  if (loading) return <LoadingScreen />

  const InvoiceRow = ({ inv, color }) => (
    <TouchableOpacity
      style={styles.invRow}
      onPress={() => navigation.navigate('InvoiceDetail', { id: inv.id })}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.invNum}>{inv.invoice_number}</Text>
        <Text style={styles.invCustomer}>{inv.customer_name}</Text>
        <Text style={[styles.invDue, { color }]}>Due: {inv.due_date}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.invBalance, { color }]}>{fmt(inv.balance_due)}</Text>
        {inv.is_overdue
          ? <Text style={[styles.invTag, { color }]}>{inv.days_overdue}d overdue</Text>
          : <Text style={[styles.invTag, { color }]}>Due soon</Text>
        }
      </View>
      <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  )

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} colors={[COLORS.primary]} />}
    >
      {/* Days filter */}
      <View style={styles.daysBar}>
        <Text style={styles.daysLabel}>Look ahead:</Text>
        {[3, 7, 14, 30].map(d => (
          <TouchableOpacity
            key={d}
            onPress={() => setDays(d)}
            style={[styles.daysBtn, days === d && styles.daysBtnActive]}
          >
            <Text style={[styles.daysBtnText, days === d && styles.daysBtnTextActive]}>{d}d</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ padding: 12 }}>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderTopColor: COLORS.danger }]}>
            <Ionicons name="alert-circle" size={22} color={COLORS.danger} />
            <Text style={[styles.summaryCount, { color: COLORS.danger }]}>{data?.overdue_count || 0}</Text>
            <Text style={styles.summaryLabel}>Overdue</Text>
            <Text style={[styles.summaryAmount, { color: COLORS.danger }]}>{fmt(data?.overdue_amount)}</Text>
          </View>
          <View style={[styles.summaryCard, { borderTopColor: COLORS.warning }]}>
            <Ionicons name="time" size={22} color={COLORS.warning} />
            <Text style={[styles.summaryCount, { color: COLORS.warning }]}>{data?.due_soon_count || 0}</Text>
            <Text style={styles.summaryLabel}>Due Soon</Text>
            <Text style={[styles.summaryAmount, { color: COLORS.warning }]}>{fmt(data?.due_soon_amount)}</Text>
          </View>
        </View>

        {/* Overdue */}
        <Text style={styles.sectionTitle}>🚨 Overdue Invoices</Text>
        {!data?.overdue?.length ? (
          <Card>
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>✅</Text>
              <Text style={{ color: COLORS.primaryLight, fontWeight: '600' }}>No overdue invoices!</Text>
            </View>
          </Card>
        ) : (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {data.overdue.map((inv, i) => (
              <View key={inv.id} style={i > 0 && { borderTopWidth: 1, borderTopColor: '#f5f5f5' }}>
                <InvoiceRow inv={inv} color={COLORS.danger} />
              </View>
            ))}
          </Card>
        )}

        {/* Due Soon */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>⏰ Due in {days} Days</Text>
        {!data?.due_soon?.length ? (
          <Card>
            <Text style={{ textAlign: 'center', color: COLORS.textMuted, paddingVertical: 12 }}>
              No invoices due in the next {days} days
            </Text>
          </Card>
        ) : (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {data.due_soon.map((inv, i) => (
              <View key={inv.id} style={i > 0 && { borderTopWidth: 1, borderTopColor: '#f5f5f5' }}>
                <InvoiceRow inv={inv} color={COLORS.warning} />
              </View>
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  daysBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 8 },
  daysLabel: { fontSize: 12, color: COLORS.textMuted, marginRight: 4 },
  daysBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: '#f5f5f5' },
  daysBtnActive: { backgroundColor: COLORS.primaryPale },
  daysBtnText: { fontSize: 12, color: COLORS.textMuted },
  daysBtnTextActive: { color: COLORS.primary, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderTopWidth: 4, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  summaryCount: { fontSize: 28, fontWeight: '800', marginTop: 6 },
  summaryLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  summaryAmount: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  invRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  invNum: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  invCustomer: { fontSize: 13, color: COLORS.text, marginTop: 1 },
  invDue: { fontSize: 11, marginTop: 2 },
  invBalance: { fontSize: 14, fontWeight: '800' },
  invTag: { fontSize: 10, fontWeight: '600', marginTop: 2 },
})
