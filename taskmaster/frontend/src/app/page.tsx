'use client';

import { useEffect, useState } from 'react';
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
  Check,
  Mail,
  FileText,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Generate random stars
const generateStars = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 2,
  }));

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

// Smooth scroll function
const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

export default function LandingPage() {
  const [stars, setStars] = useState<ReturnType<typeof generateStars>>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setStars(generateStars(60));
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-cosmic-darker via-cosmic-dark to-cosmic-darker" />

        {/* Animated Stars */}
        {mounted && (
          <div className="absolute inset-0">
            {stars.map((star) => (
              <motion.div
                key={star.id}
                className="absolute rounded-full bg-white"
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  width: star.size,
                  height: star.size,
                }}
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: star.duration,
                  delay: star.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        )}

        {/* Comet */}
        {mounted && (
          <motion.div
            className="absolute"
            style={{
              left: '5%',
              top: '15%',
            }}
            animate={{
              x: ['0vw', '100vw'],
              y: ['0vh', '40vh'],
            }}
            transition={{
              duration: 12,
              delay: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            {/* Comet head */}
            <div
              className="absolute rounded-full"
              style={{
                width: 6,
                height: 6,
                background: 'radial-gradient(circle, #fff 0%, #87CEEB 50%, #4169E1 100%)',
                boxShadow: '0 0 12px 3px rgba(135, 206, 235, 0.8), 0 0 24px 6px rgba(65, 105, 225, 0.4)',
              }}
            />
            {/* Comet tail */}
            <div
              className="absolute"
              style={{
                width: 60,
                height: 4,
                right: 3,
                top: '50%',
                transform: 'translateY(-50%) rotate(35deg)',
                transformOrigin: 'right center',
                background: 'linear-gradient(to left, rgba(135, 206, 235, 0.8), rgba(65, 105, 225, 0.4), transparent)',
                filter: 'blur(1px)',
                borderRadius: '50% 0 0 50%',
              }}
            />
          </motion.div>
        )}

        {/* Nebula clouds */}
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 opacity-20"
          style={{
            background: 'radial-gradient(ellipse, rgba(147, 51, 234, 0.4) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.div
          className="absolute bottom-0 left-1/3 w-80 h-80 opacity-15"
          style={{
            background: 'radial-gradient(ellipse, rgba(6, 182, 212, 0.4) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Rocket className="w-8 h-8 text-cosmic-purple" />
            <span className="text-xl font-bold gradient-text">TaskMaster</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('features')} className="text-gray-300 hover:text-white transition">
              Features
            </button>
            <button onClick={() => scrollToSection('pricing')} className="text-gray-300 hover:text-white transition">
              Pricing
            </button>
            <button onClick={() => scrollToSection('about')} className="text-gray-300 hover:text-white transition">
              About
            </button>
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
      <section className="pt-32 pb-20 px-6 relative z-10">
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
              <span className="gradient-text">Transform Your Team&apos;s</span>
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
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 border-gray-600"
                onClick={() => scrollToSection('features')}
              >
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
      <section id="features" className="py-20 px-6 relative z-10">
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
      <section id="pricing" className="py-20 px-6 relative z-10">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              <span className="gradient-text">Simple Pricing</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Choose the plan that fits your team&apos;s needs.
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
                <Link href="/auth/register">
                  <Button
                    className={`w-full ${plan.popular ? 'bg-cosmic-purple hover:bg-cosmic-purple/80' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    Get Started
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-6 relative z-10">
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

      {/* Privacy Section */}
      <section id="privacy" className="py-20 px-6 relative z-10">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="glass-card"
          >
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-8 h-8 text-cosmic-purple" />
              <h2 className="text-3xl font-bold gradient-text">Privacy Policy</h2>
            </div>
            <div className="space-y-4 text-gray-300">
              <p>
                At TaskMaster, we take your privacy seriously. We collect only the information
                necessary to provide you with the best task management experience.
              </p>
              <p>
                Your data is encrypted using industry-standard AES-256 encryption both in transit
                and at rest. We never sell your personal information to third parties.
              </p>
              <p>
                You have full control over your data and can request deletion at any time through
                your account settings or by contacting our support team.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Terms Section */}
      <section id="terms" className="py-20 px-6 relative z-10">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="glass-card"
          >
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-8 h-8 text-cosmic-purple" />
              <h2 className="text-3xl font-bold gradient-text">Terms of Service</h2>
            </div>
            <div className="space-y-4 text-gray-300">
              <p>
                By using TaskMaster, you agree to these terms of service. Our platform is designed
                for professional task management and team collaboration.
              </p>
              <p>
                Users are responsible for maintaining the confidentiality of their account credentials.
                Any activities under your account are your responsibility.
              </p>
              <p>
                We reserve the right to suspend accounts that violate our acceptable use policy,
                including spam, harassment, or illegal activities.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-6 relative z-10">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="glass-card"
          >
            <div className="flex items-center gap-3 mb-6">
              <Mail className="w-8 h-8 text-cosmic-purple" />
              <h2 className="text-3xl font-bold gradient-text">Contact Us</h2>
            </div>
            <div className="space-y-4 text-gray-300">
              <p>
                Have questions or need support? We&apos;re here to help! Our team is available
                24/7 to assist you with any inquiries.
              </p>
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div className="p-4 rounded-xl bg-glass-light">
                  <h3 className="font-semibold mb-2">Email Support</h3>
                  <p className="text-cosmic-purple">support@taskmaster.io</p>
                </div>
                <div className="p-4 rounded-xl bg-glass-light">
                  <h3 className="font-semibold mb-2">Sales Inquiries</h3>
                  <p className="text-cosmic-purple">sales@taskmaster.io</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-glass-border relative z-10">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Rocket className="w-6 h-6 text-cosmic-purple" />
              <span className="font-bold">TaskMaster</span>
            </div>
            <div className="flex items-center gap-6 text-gray-400 text-sm">
              <button
                onClick={() => scrollToSection('privacy')}
                className="hover:text-white transition"
              >
                Privacy
              </button>
              <button
                onClick={() => scrollToSection('terms')}
                className="hover:text-white transition"
              >
                Terms
              </button>
              <button
                onClick={() => scrollToSection('contact')}
                className="hover:text-white transition"
              >
                Contact
              </button>
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
