import React, { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  Dimensions, TouchableOpacity, RefreshControl
} from 'react-native'
import { BarChart } from 'react-native-chart-kit'
import { dashboardAPI, fmt } from '../api/api'
import { StatCard, Card, SectionHeader, LoadingScreen, Badge } from '../components/UI'
import { COLORS, STATUS_COLORS } from '../theme'
import { useAuth } from '../context/AuthContext'
import { useNavigation } from '@react-navigation/native'

const W = Dimensions.get('window').width

export default function DashboardScreen() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { user } = useAuth()
  const navigation = useNavigation()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const load = async () => {
    try {
      const { data: d } = await dashboardAPI.analytics({ from, to })
      setData(d)
    } catch (e) {
      console.log('Dashboard error:', e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  
  useEffect(() => { load() }, [])

  if (loading) return <LoadingScreen />
  useEffect(() => {
  load()
   }, [from, to])
  const chartData = Object.entries(data?.daily || {}).map(([date, v]) => ({
  label: date.slice(5),
  sales: v.sales,
  purchases: v.purchases,
  }))
  const barData = {
    labels: chartData.map(m => m.label),
    datasets: [
      { data: chartData.map(m => m.sales || 0), color: () => COLORS.primaryLight },
      { data: chartData.map(m => m.purchases || 0), color: () => COLORS.info },
    ],
    legend: ['Sales', 'Purchases'],
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} colors={[COLORS.primary]} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good day, {user?.first_name || user?.username}! 👋</Text>
          <Text style={styles.subGreeting}>Here's your business overview</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{(user?.username || 'U')[0].toUpperCase()}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
  
      <TouchableOpacity onPress={() => {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        setFrom(d.toISOString().split('T')[0])
        setTo(new Date().toISOString().split('T')[0])
        }}>
       <Text style={{ marginRight: 10, color: COLORS.primary }}>7D</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => {
       const d = new Date()
       d.setDate(d.getDate() - 30)
       setFrom(d.toISOString().split('T')[0])
       setTo(new Date().toISOString().split('T')[0])
      }}>
      <Text style={{ color: COLORS.primary }}>30D</Text>
      </TouchableOpacity>

      </View>
      <View style={styles.content}>
        {/* Stat Cards */}
        <View style={styles.statsRow}>
          <StatCard
            label="Total Sales"
            value={fmt(data?.total_sales)}
            color={COLORS.primaryLight}
            onPress={() => navigation.navigate('Transactions')}
            style={{ marginRight: 8 }}
          />
          <StatCard
            label="Total Purchases"
            value={fmt(data?.total_purchases)}
            color={COLORS.info}
            onPress={() => navigation.navigate('Transactions')}
          />
        </View>
        <View style={[styles.statsRow, { marginTop: 10 }]}>
          <StatCard
            label="Outstanding"
            value={fmt(data?.total_outstanding)}
            color={COLORS.warning}
            sub={`${data?.total_invoices || 0} invoices`}
            onPress={() => navigation.navigate('Invoices')}
            style={{ marginRight: 8 }}
          />
          <StatCard
            label="Overdue"
            value={fmt(data?.overdue_amount)}
            color={COLORS.danger}
            sub={`${data?.overdue_count || 0} invoices`}
            onPress={() => navigation.navigate('Reminders')}
          />
        </View>

        {/* Chart */}
        {chartData.length > 0 && (
          <Card style={{ marginTop: 16 }}>
            <SectionHeader title="Sales vs Purchases" />
            <BarChart
              data={barData}
              width={W - 64}
              height={180}
              yAxisLabel="₹"
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(26, 107, 58, ${opacity})`,
                labelColor: () => COLORS.textMuted,
                style: { borderRadius: 8 },
                barPercentage: 0.5,
              }}
              style={{ borderRadius: 8, marginTop: 8 }}
              showLegend
            />
          </Card>
        )}

        {/* Top Customers */}
        {data?.top_customers?.length > 0 && (
          <Card>
            <SectionHeader title="🏆 Top Customers" />
            {data.top_customers.map((c, i) => (
              <View key={i} style={styles.customerRow}>
                <View style={[styles.rankCircle, { backgroundColor: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : COLORS.primaryPale }]}>
                  <Text style={styles.rankText}>{i + 1}</Text>
                </View>
                <Text style={styles.customerName} numberOfLines={1}>{c.name}</Text>
                <Text style={styles.customerAmount}>{fmt(c.total)}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Recent Transactions */}
        {data?.recent_transactions?.length > 0 && (
          <Card>
            <SectionHeader
              title="Recent Transactions"
              action="View All"
              onAction={() => navigation.navigate('Transactions')}
            />
            {data.recent_transactions.map(t => (
              <View key={t.id} style={styles.txnRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnProduct} numberOfLines={1}>{t.product_name}</Text>
                  <Text style={styles.txnDate}>{t.transaction_date} · {t.customer_name || '—'}</Text>
                </View>
                <Text style={[styles.txnAmount, { color: t.transaction_type === 'sell' ? COLORS.primaryLight : COLORS.info }]}>
                  {t.transaction_type === 'sell' ? '+' : '-'}{fmt(t.total_amount)}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Overdue Invoices */}
        {data?.overdue_invoices?.length > 0 && (
          <Card>
            <SectionHeader
              title="⚠️ Overdue Invoices"
              action="View All"
              onAction={() => navigation.navigate('Reminders')}
            />
            {data.overdue_invoices.map(inv => (
              <TouchableOpacity
                key={inv.id}
                style={styles.overdueRow}
                onPress={() => navigation.navigate('InvoiceDetail', { id: inv.id })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnProduct}>{inv.customer_name}</Text>
                  <Text style={[styles.txnDate, { color: COLORS.danger }]}>
                    {inv.days_overdue} days overdue · {inv.invoice_number}
                  </Text>
                </View>
                <Text style={[styles.txnAmount, { color: COLORS.danger }]}>{fmt(inv.balance_due)}</Text>
              </TouchableOpacity>
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { fontSize: 18, fontWeight: '700', color: '#fff' },
  subGreeting: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  content: { padding: 16 },
  statsRow: { flexDirection: 'row' },
  customerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  rankCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  rankText: { fontSize: 11, fontWeight: '700' },
  customerName: { flex: 1, fontSize: 13, color: COLORS.text },
  customerAmount: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  txnRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  txnProduct: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  txnDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  txnAmount: { fontSize: 13, fontWeight: '700', marginLeft: 8 },
  overdueRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
})
