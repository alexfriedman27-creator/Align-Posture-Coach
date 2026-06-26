import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, getBadgeDefinition, CATEGORY_COLORS } from '../../types/Badge';
import { Colors } from '../../lib/design/colors';
import { Typography } from '../../lib/design/fonts';
import { Spacing } from '../../lib/design/spacing';
import { Radii } from '../../lib/design/radii';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const N_PARTICLES = 18;
const EXTRA_COLORS = ['#FFD700', '#FF6B6B', '#4EA8FF', '#4EC97B', '#B57BFF', '#FF9F43', '#FF6EB4'];

interface ParticleConfig { tx: number; ty: number; color: string; size: number }

// Particle burst centered on the icon
function ParticleBurst({ categoryColor }: { categoryColor: string }) {
  const config = useMemo<ParticleConfig[]>(
    () =>
      Array.from({ length: N_PARTICLES }, (_, i) => {
        const angle =
          ((i / N_PARTICLES) * 360 + (Math.random() * 24 - 12)) * (Math.PI / 180);
        const dist = 80 + Math.random() * 80;
        return {
          tx: Math.cos(angle) * dist,
          ty: Math.sin(angle) * dist,
          color:
            Math.random() > 0.45
              ? categoryColor
              : EXTRA_COLORS[Math.floor(Math.random() * EXTRA_COLORS.length)],
          size: 5 + Math.random() * 5,
        };
      }),
    [],
  );

  const anims = useMemo(() => Array.from({ length: N_PARTICLES }, () => new Animated.Value(0)), []);

  useEffect(() => {
    Animated.stagger(
      14,
      anims.map((a) =>
        Animated.timing(a, { toValue: 1, duration: 950, useNativeDriver: true }),
      ),
    ).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((anim, i) => {
        const { tx, ty, color, size } = config[i];
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: size,
              height: size,
              marginTop: -(size / 2),
              marginLeft: -(size / 2),
              borderRadius: size / 2,
              backgroundColor: color,
              transform: [
                { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, tx] }) },
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, ty] }) },
                { scale: anim.interpolate({ inputRange: [0, 0.22, 1], outputRange: [0, 1.6, 0.3] }) },
              ],
              opacity: anim.interpolate({
                inputRange: [0, 0.07, 0.55, 1],
                outputRange: [0, 1, 0.95, 0],
              }),
            }}
          />
        );
      })}
    </View>
  );
}

interface Props {
  badges: Badge[];
  onDismiss: () => void;
}

export function BadgeReveal({ badges, onDismiss }: Props) {
  const [index, setIndex] = useState(0);
  const [burstKey, setBurstKey] = useState(0);

  const scrimAnim   = useRef(new Animated.Value(0)).current;
  const cardAnim    = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const iconAnim    = useRef(new Animated.Value(0)).current;
  const mainRef     = useRef<Animated.CompositeAnimation | null>(null);
  const iconRef     = useRef<Animated.CompositeAnimation | null>(null);

  const badge  = badges[index];
  const def    = getBadgeDefinition(badge.id);
  const color  = def ? (def.color ?? CATEGORY_COLORS[def.category]) : CATEGORY_COLORS.special;
  const isLast = index === badges.length - 1;

  useEffect(() => {
    cardAnim.setValue(0);
    contentAnim.setValue(0);
    iconAnim.setValue(0);

    const cardIn = Animated.sequence([
      Animated.spring(cardAnim,    { toValue: 1, tension: 90, friction: 8,  useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 1, duration: 180,             useNativeDriver: true }),
    ]);

    if (index === 0) {
      mainRef.current = Animated.sequence([
        Animated.timing(scrimAnim, { toValue: 1, duration: 210, useNativeDriver: true }),
        cardIn,
      ]);
    } else {
      mainRef.current = cardIn;
    }
    mainRef.current.start();

    iconRef.current = Animated.sequence([
      Animated.delay(300),
      Animated.spring(iconAnim, { toValue: 1, tension: 65, friction: 5, useNativeDriver: true }),
    ]);
    iconRef.current.start();

    return () => {
      mainRef.current?.stop();
      iconRef.current?.stop();
    };
  }, [index]);

  function advance() {
    mainRef.current?.stop();
    iconRef.current?.stop();

    if (!isLast) {
      Animated.parallel([
        Animated.timing(contentAnim, { toValue: 0, duration: 110, useNativeDriver: true }),
        Animated.timing(cardAnim,    { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => {
        setBurstKey((k) => k + 1);
        setIndex((i) => i + 1);
      });
    } else {
      Animated.parallel([
        Animated.timing(scrimAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(cardAnim,  { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `I just unlocked "${badge.name}" on Align! ${def?.description ?? badge.description} 💪`,
        title: 'Achievement Unlocked',
      });
    } catch {}
  }

  return (
    <Animated.View style={[styles.scrim, { opacity: scrimAnim }]}>
      <Animated.View
        style={[
          styles.card,
          { borderColor: color + '40' },
          {
            opacity: cardAnim,
            transform: [
              { scale:      cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }) },
              { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [52, 0]  }) },
            ],
          },
        ]}
      >
        {/* Icon area — glow rings, particle burst, animated icon */}
        <View style={styles.iconArea}>
          {/* Outer glow */}
          <View
            style={[styles.glowCircle, {
              width: 200, height: 200, borderRadius: 100,
              backgroundColor: color, opacity: 0.05,
              marginTop: -100, marginLeft: -100,
            }]}
          />
          {/* Inner glow */}
          <View
            style={[styles.glowCircle, {
              width: 130, height: 130, borderRadius: 65,
              backgroundColor: color, opacity: 0.1,
              marginTop: -65, marginLeft: -65,
            }]}
          />

          <ParticleBurst key={burstKey} categoryColor={color} />

          <Animated.View style={{ alignItems: 'center', gap: 10, transform: [{ scale: iconAnim }] }}>
            <View style={[styles.iconCircle, { backgroundColor: color + '22', borderColor: color + 'AA' }]}>
              <Ionicons name={badge.iconName as IoniconsName} size={40} color={color} />
            </View>
            {(def?.stars ?? 0) > 0 && (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {Array.from({ length: def!.stars! }, (_, i) => (
                  <View key={i} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }} />
                ))}
              </View>
            )}
          </Animated.View>
        </View>

        {/* Text + actions */}
        <Animated.View style={[styles.content, { opacity: contentAnim }]}>
          <Text style={[styles.achievementLabel, { color }]}>ACHIEVEMENT UNLOCKED</Text>
          <Text style={styles.badgeName}>{badge.name}</Text>
          <Text style={styles.badgeDesc}>{def?.description ?? badge.description}</Text>

          {/* Progress dots for multiple badges */}
          {badges.length > 1 && (
            <View style={styles.dotsRow}>
              {badges.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === index
                      ? { backgroundColor: color, width: 20 }
                      : { backgroundColor: Colors.cardElevated },
                  ]}
                />
              ))}
            </View>
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
              <Ionicons name="share-social-outline" size={17} color={Colors.secondaryText} />
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.continueBtn, { backgroundColor: color }]}
              onPress={advance}
              activeOpacity={0.82}
            >
              <Text style={styles.continueBtnText}>{isLast ? 'Continue' : 'Next'}</Text>
              <Ionicons
                name={isLast ? 'checkmark' : 'arrow-forward'}
                size={15}
                color={Colors.white}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(4,6,14,0.93)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 320,
    backgroundColor: Colors.card,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    paddingBottom: Spacing.card,
  },
  iconArea: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
  },
  iconCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.card,
    gap: Spacing.tight,
  },
  achievementLabel: {
    ...Typography.label,
    letterSpacing: 1.5,
  },
  badgeName: {
    ...Typography.headline,
    textAlign: 'center',
  },
  badgeDesc: {
    ...Typography.body,
    color: Colors.secondaryText,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.tight,
    marginTop: Spacing.inner,
    width: '100%',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.inner,
    paddingVertical: 14,
    borderRadius: Radii.button,
    backgroundColor: Colors.cardElevated,
  },
  shareBtnText: {
    ...Typography.bodyMedium,
    color: Colors.secondaryText,
  },
  continueBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: Radii.button,
  },
  continueBtnText: {
    ...Typography.bodyMedium,
    color: Colors.white,
  },
});
