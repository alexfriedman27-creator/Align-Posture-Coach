import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../lib/design/colors';
import { FontFamily } from '../lib/design/fonts';

// Refined mark geometry (SVG units, viewBox 100×140)
const WIDTHS = [38, 31, 24, 18];
const HEAD_R = 13;
const SEG_H = 15;
const SEG_GAP = 6;
const SEG_RX = 6.5;
const NECK_GAP = 7;
const SCALE = 0.9;

// Derived positions
const stackH = WIDTHS.length * SEG_H + (WIDTHS.length - 1) * SEG_GAP; // 78
const totalH = HEAD_R * 2 + NECK_GAP + stackH; // 111
const topOff = (140 - totalH) / 2; // 14.5
const headCy = topOff + HEAD_R; // 27.5
const firstCy = topOff + HEAD_R * 2 + NECK_GAP + SEG_H / 2; // 55

// Entrance offsets (px from resting position)
const HEAD_FROM_Y = -120;
const SEG_FROM_X = [160, -180, 130, -100];

const MARK_W = 100 * SCALE; // 90px
const MARK_H = 140 * SCALE; // 126px
const SEG_COLOR = Colors.accent;
const HEAD_COLOR = Colors.infoMuted;

function AnimatedMark() {
  const opacity = useRef(new Animated.Value(0)).current;
  const headY = useRef(new Animated.Value(HEAD_FROM_Y)).current;
  const segX = useRef(SEG_FROM_X.map(x => new Animated.Value(x))).current;

  useEffect(() => {
    let alive = true;

    function loop() {
      if (!alive) return;

      opacity.setValue(0);
      headY.setValue(HEAD_FROM_Y);
      segX.forEach((v, i) => v.setValue(SEG_FROM_X[i]));

      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(headY, {
            toValue: 0,
            duration: 560,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          ...segX.map((v, i) =>
            Animated.timing(v, {
              toValue: 0,
              duration: 500,
              delay: i * 65,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            })
          ),
        ]),
        Animated.delay(900),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.delay(220),
      ]).start(result => {
        if (result.finished && alive) loop();
      });
    }

    loop();
    return () => { alive = false; };
  }, []);

  return (
    <Animated.View style={{ width: MARK_W, height: MARK_H, opacity }}>
      <Animated.View
        style={{
          position: 'absolute',
          left: (50 - HEAD_R) * SCALE,
          top: (headCy - HEAD_R) * SCALE,
          width: HEAD_R * 2 * SCALE,
          height: HEAD_R * 2 * SCALE,
          borderRadius: HEAD_R * SCALE,
          backgroundColor: HEAD_COLOR,
          transform: [{ translateY: headY }],
        }}
      />
      {WIDTHS.map((w, i) => {
        const cy = firstCy + i * (SEG_H + SEG_GAP);
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: (50 - w / 2) * SCALE,
              top: (cy - SEG_H / 2) * SCALE,
              width: w * SCALE,
              height: SEG_H * SCALE,
              borderRadius: SEG_RX * SCALE,
              backgroundColor: SEG_COLOR,
              transform: [{ translateX: segX[i] }],
            }}
          />
        );
      })}
    </Animated.View>
  );
}

export default function AlignLoadingScreen() {
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.content, { opacity: textOpacity }]}>
        <Text style={styles.title} allowFontScaling={false}>Align</Text>
        <Text style={styles.subtitle} allowFontScaling={false} numberOfLines={1}>
          posture coach
        </Text>
      </Animated.View>
      <View style={styles.markWrap}>
        <AnimatedMark />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontFamily: FontFamily.poppinsExtraBold,
    fontSize: 58,
    color: Colors.primaryText,
    lineHeight: 66,
    letterSpacing: -1.5,
  },
  subtitle: {
    fontFamily: FontFamily.poppinsRegular,
    fontSize: 15,
    color: Colors.secondaryText,
    letterSpacing: 0.2,
    marginTop: 4,
  },
  markWrap: {
    marginTop: 36,
    alignItems: 'center',
    overflow: 'visible',
  },
});
