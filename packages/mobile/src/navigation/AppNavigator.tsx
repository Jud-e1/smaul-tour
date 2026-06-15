import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../store/auth';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

// Main screens
import ExperiencesScreen from '../screens/ExperiencesScreen';
import ExperienceDetailScreen from '../screens/ExperienceDetailScreen';
import TripPlannerScreen from '../screens/TripPlannerScreen';
import BookingScreen from '../screens/BookingScreen';
import TravelerDashboardScreen from '../screens/TravelerDashboardScreen';
import GuideDashboardScreen from '../screens/GuideDashboardScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ResetPassword: undefined;
  Experiences: undefined;
  ExperienceDetail: { id: string };
  TripPlanner: undefined;
  Booking: { experienceId: string };
  TravelerDashboard: undefined;
  GuideDashboard: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerStyle: { backgroundColor: '#2563EB' }, headerTintColor: '#fff' }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign In' }} />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ title: 'Create Account' }}
            />
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
              options={{ title: 'Reset Password' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Experiences"
              component={ExperiencesScreen}
              options={{ title: 'Experiences' }}
            />
            <Stack.Screen
              name="ExperienceDetail"
              component={ExperienceDetailScreen}
              options={{ title: 'Experience' }}
            />
            <Stack.Screen
              name="TripPlanner"
              component={TripPlannerScreen}
              options={{ title: 'AI Trip Planner' }}
            />
            <Stack.Screen
              name="Booking"
              component={BookingScreen}
              options={{ title: 'Book Experience' }}
            />
            {user?.role === 'guide' ? (
              <Stack.Screen
                name="GuideDashboard"
                component={GuideDashboardScreen}
                options={{ title: 'My Dashboard' }}
              />
            ) : (
              <Stack.Screen
                name="TravelerDashboard"
                component={TravelerDashboardScreen}
                options={{ title: 'My Dashboard' }}
              />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
