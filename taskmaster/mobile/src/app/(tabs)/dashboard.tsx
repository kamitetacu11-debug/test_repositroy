import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth.store';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 16) / 2;

const mockStats = [
  { label: 'Tasks Done', value: '47', icon: 'checkmark-circle', color: '#10b981', change: '+8' },
  { label: 'Total Points', value: '5.5K', icon: 'star', color: '#7c3aed', change: '+340' },
  { label: 'Streak', value: '15d', icon: 'flame', color: '#f97316', change: '' },
  { label: 'Rank', value: 'Expert', icon: 'trophy', color: '#fbbf24', change: 'Lvl 10' },
];

const mockTasks = [
  { id: '1', title: 'Design dashboard UI', priority: 'HIGH', status: 'IN_PROGRESS' },
  { id: '2', title: 'Implement API endpoints', priority: 'CRITICAL', status: 'TODO' },
  { id: '3', title: 'Write unit tests', priority: 'MEDIUM', status: 'TODO' },
];

const mockLeaderboard = [
  { name: 'John Doe', points: 5500, rank: 1 },
  { name: 'Jane Smith', points: 3200, rank: 2 },
  { name: 'Bob Johnson', points: 1800, rank: 3 },
];

export default function DashboardScreen() {
  const { user } = useAuthStore();

  return (
    <LinearGradient colors={['#0a0a1a', '#1e1b4b', '#0a0a1a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.firstName || 'User'}</Text>
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </Animated.View>

          {/* Stats Grid */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.statsGrid}>
            {mockStats.map((stat, index) => (
              <BlurView key={index} intensity={20} tint="dark" style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}20` }]}>
                  <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
                {stat.change && <Text style={[styles.statChange, { color: stat.color }]}>{stat.change}</Text>}
              </BlurView>
            ))}
          </Animated.View>

          {/* Active Tasks */}
          <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Tasks</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {mockTasks.map((task, index) => (
              <Animated.View key={task.id} entering={FadeInRight.delay(500 + index * 100).duration(400)}>
                <BlurView intensity={20} tint="dark" style={styles.taskCard}>
                  <View style={styles.taskPriority}>
                    <View style={[
                      styles.priorityDot,
                      { backgroundColor: task.priority === 'CRITICAL' ? '#ef4444' : task.priority === 'HIGH' ? '#f97316' : '#3b82f6' }
                    ]} />
                  </View>
                  <View style={styles.taskContent}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.taskStatus}>{task.status.replace('_', ' ')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                </BlurView>
              </Animated.View>
            ))}
          </Animated.View>

          {/* Leaderboard */}
          <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Leaderboard</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            <BlurView intensity={20} tint="dark" style={styles.leaderboardCard}>
              {mockLeaderboard.map((user, index) => (
                <View key={index} style={[styles.leaderboardItem, index < mockLeaderboard.length - 1 && styles.leaderboardItemBorder]}>
                  <Text style={styles.leaderboardRank}>#{user.rank}</Text>
                  <View style={styles.leaderboardAvatar}>
                    <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.leaderboardInfo}>
                    <Text style={styles.leaderboardName}>{user.name}</Text>
                    <Text style={styles.leaderboardPoints}>{user.points.toLocaleString()} pts</Text>
                  </View>
                  {index === 0 && <Ionicons name="trophy" size={20} color="#fbbf24" />}
                </View>
              ))}
            </BlurView>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#9ca3af',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    width: CARD_WIDTH,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  statChange: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  seeAll: {
    fontSize: 14,
    color: '#7c3aed',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  taskPriority: {
    marginRight: 12,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  taskStatus: {
    fontSize: 12,
    color: '#9ca3af',
  },
  leaderboardCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  leaderboardItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  leaderboardRank: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    width: 32,
  },
  leaderboardAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  leaderboardPoints: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
