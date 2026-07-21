import { Link, usePathname } from 'expo-router';
import { memo, useMemo } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

/**
 * Navigation entries. Declared as a `const` tuple (frozen at module scope):
 *   - allocated exactly once for the app lifetime,
 *   - V8 can keep it as a packed string array,
 *   - iteration is O(n) on a tiny, never-growing list.
 * Adding a page → add one entry here. Single source of truth.
 */
const NAV_ITEMS = [
  { href: '/home', label: 'Home' },
  { href: '/programs', label: 'Programs' },
  { href: '/curriculum', label: 'Curriculum' },
  { href: '/aboutus', label: 'About Us' },
  { href: '/onlineapplication', label: 'Online Application' },
  { href: '/login', label: 'Login' },
] as const satisfies ReadonlyArray<{ href: string; label: string }>;

type NavItem = (typeof NAV_ITEMS)[number];

/**
 * O(1)-amortized active-route match.
 *   pathname === href               → exact
 *   startsWith(href + '/')          → child
 * Pure string ops, no regex, no allocations per render.
 */
function isActive(pathname: string, href: NavItem['href']): boolean {
  if (pathname === href) return true;
  return (
    pathname.length > href.length &&
    pathname.startsWith(href) &&
    pathname.charCodeAt(href.length) === 47 /* '/' */
  );
}

type NavButtonProps = {
  label: string;
  href: NavItem['href'];
  active: boolean;
};

/**
 * One nav button.
 *   - `React.memo` + shallow prop compare → only re-renders when its own
 *     `active` flips or `label`/`href` change.
 *   - Hover/press state is held in a Reanimated shared value, so the
 *     scale + tint animation runs on the UI thread at 60 fps even if
 *     the JS thread is busy. The component itself never re-renders
 *     due to hover.
 */
const NavButton = memo(function NavButton({ label, href, active }: NavButtonProps) {
  // 0 = idle, 1 = hovered/pressed. Interpolated on the UI thread.
  const focus = useSharedValue(0);

  // Hover is only meaningful with a pointer — guard so mobile ignores it.
  const hoverHandlers =
    Platform.OS === 'web'
      ? {
          onHoverIn: () => {
            focus.value = withTiming(1, TIMING);
          },
          onHoverOut: () => {
            focus.value = withTiming(0, TIMING);
          },
        }
      : {};

  const onPressIn = () => {
    focus.value = withTiming(1, TIMING);
  };
  const onPressOut = () => {
    focus.value = withTiming(0, TIMING);
  };

  const animatedStyle = useAnimatedStyle(() => {
    // Slight lift + tint that gets stronger on hover, gentle on idle.
    const scale = 1 + focus.value * 0.04; // 1.0 → 1.04
    return {
      transform: [{ scale }],
      backgroundColor: active
        ? `rgba(60, 135, 247, ${0.08 + focus.value * 0.12})`
        : `rgba(0, 0, 0, ${focus.value * 0.04})`,
    };
  });

  // expo-router's <Link asChild> warns when its only child receives an array
  // of styles. Flatten once per render so the child gets a single plain object.
  const buttonWrapStyle = StyleSheet.flatten([styles.buttonWrap, animatedStyle]) as StyleProp<ViewStyle>;

  return (
    <Link href={href as Parameters<typeof Link>[0]['href']} asChild>
      <Animated.View style={buttonWrapStyle}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={label}
          accessibilityState={{ selected: active }}
          hitSlop={Spacing.two}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          {...hoverHandlers}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <ThemedText
            type="smallBold"
            themeColor={active ? 'text' : 'textSecondary'}
            numberOfLines={1}
            style={styles.buttonLabel}>
            {label}
          </ThemedText>
        </Pressable>
      </Animated.View>
    </Link>
  );
});

const TIMING = { duration: 180, easing: Easing.out(Easing.quad) };

function NavbarImpl() {
  const pathname = usePathname() ?? '/';
  const { width } = useWindowDimensions();

  // Below 720px: horizontal scroll. Above: centered wrap row.
  const isCompact = width < 720;

  // Memoized — `pathname` is the only re-render trigger.
  const items = useMemo(
    () =>
      NAV_ITEMS.map((item) => (
        <NavButton
          key={item.href}
          label={item.label}
          href={item.href}
          active={isActive(pathname, item.href)}
        />
      )),
    [pathname],
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ThemedView style={styles.bar}>
        {isCompact ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rowCenter}>
            {items}
          </ScrollView>
        ) : (
          <ThemedView style={styles.rowCenter}>{items}</ThemedView>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

export const Navbar = memo(NavbarImpl);

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.light.background, // pure white on light scheme
  },
  // Light, maximalist bar: white surface, soft border, generous vertical padding.
  bar: {
    backgroundColor: Colors.light.background,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15, 23, 42, 0.06)',
    // Soft shadow for that "floating over content" maximalist feel.
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // ← centered
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  // Animated.View wrapper owns the scale + background tint.
  buttonWrap: {
    borderRadius: 999, // fully rounded pill
  },
  button: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    letterSpacing: 0.2,
  },
  buttonPressed: {
    opacity: 0.85,
  },
});
