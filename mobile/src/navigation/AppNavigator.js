import React from 'react'
import { View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'

import { useAuth } from '../context/AuthContext'
import { COLORS } from '../theme'
import { LoadingScreen } from '../components/UI'

import LoginScreen from '../screens/LoginScreen'
import DashboardScreen from '../screens/DashboardScreen'
import TransactionsScreen from '../screens/TransactionsScreen'
import InvoicesScreen from '../screens/InvoicesScreen'
import InvoiceDetailScreen from '../screens/InvoiceDetailScreen'
import RemindersScreen from '../screens/RemindersScreen'
import CustomersScreen from '../screens/CustomersScreen'
import ProductsScreen from '../screens/ProductsScreen'
import ProfileScreen from '../screens/ProfileScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function InvoicesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: COLORS.primary }}>
      <Stack.Screen name="InvoicesList" component={InvoicesScreen} options={{ title: 'Invoices' }} />
      <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} options={{ title: 'Invoice Detail' }} />
    </Stack.Navigator>
  )
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Dashboard: focused ? 'grid' : 'grid-outline',
            Transactions: focused ? 'swap-horizontal' : 'swap-horizontal-outline',
            Invoices: focused ? 'document-text' : 'document-text-outline',
            Reminders: focused ? 'notifications' : 'notifications-outline',
            Customers: focused ? 'people' : 'people-outline',
            Products: focused ? 'cube' : 'cube-outline',
            Profile: focused ? 'person-circle' : 'person-circle-outline',
          }
          return <Ionicons name={icons[route.name]} size={size} color={color} />
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          borderTopColor: '#eee',
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 10 },
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen
        name="Invoices"
        component={InvoicesStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen name="Reminders" component={RemindersScreen} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="Products" component={ProductsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

export default function AppNavigator() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
