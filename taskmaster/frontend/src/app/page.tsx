'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Rocket,
  Target,
  Trophy,
  Users,
  BarChart3,
  Zap,
  Shield,
  Sparkles,
  ArrowRight,
  Star,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Target,
    title: 'Smart Task Management',
    description: 'AI-powered task prioritization and intelligent deadline suggestions.',
  },
  {
    icon: Trophy,
    title: 'Gamification & Rewards',
    description: 'Points, levels, achievements, and leaderboards to boost motivation.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Real-time updates, team competitions, and collaborative workflows.',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Deep insights into productivity patterns and performance metrics.',
  },
  {
    icon: Zap,
    title: 'AI-Powered Insights',
    description: 'Predictive analytics and personalized recommendations.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Role-based access, audit logs, and data encryption.',
  },
];

const pricingPlans = [
  {
    name: 'Starter',
    price: '$9',
    description: 'Perfect for small teams',
    features: ['Up to 10 users', 'Basic gamification', 'Task management', 'Email support'],
  },
  {
    name: 'Professional',
    price: '$29',
    description: 'For growing companies',
    features: ['Up to 50 users', 'Advanced gamification', 'AI analytics', 'API access', 'Priority support'],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large organizations',
    features: ['Unlimited users', 'Custom integrations', 'Dedicated support', 'SLA guarantee', 'On-premise option'],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Rocket className="w-8 h-8 text-cosmic-purple" />
            <span className="text-xl font-bold gradient-text">TaskMaster</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-gray-300 hover:text-white transition">Features</Link>
            <Link href="#pricing" className="text-gray-300 hover:text-white transition">Pricing</Link>
            <Link href="#about" className="text-gray-300 hover:text-white transition">About</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/register">
              <Button className="bg-cosmic-purple hover:bg-cosmic-purple/80">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
              <Sparkles className="w-4 h-4 text-cosmic-purple" />
              <span className="text-sm">AI-Powered Task Management</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="gradient-text">Transform Your Team's</span>
              <br />
              <span className="text-white">Productivity</span>
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
              TaskMaster combines AI-driven insights, gamification, and real-time collaboration
              to help your team achieve more, together.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/register">
                <Button size="lg" className="bg-cosmic-purple hover:bg-cosmic-purple/80 text-lg px-8">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-8 border-gray-600">
                Watch Demo
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20"
          >
            {[
              { value: '10K+', label: 'Active Users' },
              { value: '500K+', label: 'Tasks Completed' },
              { value: '98%', label: 'Satisfaction' },
              { value: '40%', label: 'Productivity Boost' },
            ].map((stat, i) => (
              <div key={i} className="glass-card text-center">
                <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              <span className="gradient-text">Powerful Features</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Everything you need to manage tasks, motivate teams, and achieve goals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="glass-card group"
              >
                <div className="w-12 h-12 rounded-xl bg-cosmic-purple/20 flex items-center justify-center mb-4 group-hover:bg-cosmic-purple/40 transition">
                  <feature.icon className="w-6 h-6 text-cosmic-purple" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              <span className="gradient-text">Simple Pricing</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Choose the plan that fits your team's needs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`glass-card relative ${plan.popular ? 'border-cosmic-purple' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-cosmic-purple rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold gradient-text">{plan.price}</div>
                  <p className="text-gray-400 mt-2">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-status-success" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${plan.popular ? 'bg-cosmic-purple hover:bg-cosmic-purple/80' : ''}`}
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  Get Started
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="glass-card text-center max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-4">
              Ready to <span className="gradient-text">Transform</span> Your Productivity?
            </h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Join thousands of teams already using TaskMaster to achieve their goals.
            </p>
            <Link href="/auth/register">
              <Button size="lg" className="bg-cosmic-purple hover:bg-cosmic-purple/80 text-lg px-8">
                Start Your Free Trial
                <Rocket className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-glass-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Rocket className="w-6 h-6 text-cosmic-purple" />
              <span className="font-bold">TaskMaster</span>
            </div>
            <div className="flex items-center gap-6 text-gray-400 text-sm">
              <Link href="#" className="hover:text-white transition">Privacy</Link>
              <Link href="#" className="hover:text-white transition">Terms</Link>
              <Link href="#" className="hover:text-white transition">Contact</Link>
            </div>
            <div className="text-gray-400 text-sm">
              © 2024 TaskMaster. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
