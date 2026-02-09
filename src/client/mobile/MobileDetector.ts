/**
 * Mobile device detection and platform utilities
 * Used to determine device type, orientation, and safe area insets
 */

export interface DeviceInfo {
  isTablet: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  screenSize: "small" | "medium" | "large";
}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export class MobileDetector {
  /**
   * Detects if the current device is a mobile device
   * Checks for touch capability, screen size, and user agent
   */
  static isMobile(): boolean {
    const touchDevice = "ontouchstart" in window;
    const smallScreen = window.innerWidth < 768;
    const mobileUA =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    return touchDevice && (smallScreen || mobileUA);
  }

  /**
   * Gets detailed device information
   */
  static getDeviceInfo(): DeviceInfo {
    const ua = navigator.userAgent;
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const width = window.innerWidth;

    let screenSize: "small" | "medium" | "large";
    if (width < 375) {
      screenSize = "small";
    } else if (width < 768) {
      screenSize = "medium";
    } else {
      screenSize = "large";
    }

    return {
      isTablet,
      isIOS,
      isAndroid,
      screenSize,
    };
  }

  /**
   * Gets current device orientation
   */
  static getOrientation(): "portrait" | "landscape" {
    return window.innerHeight > window.innerWidth ? "portrait" : "landscape";
  }

  /**
   * Gets safe area insets for notched devices (iPhone X+, etc.)
   */
  static getSafeAreaInsets(): SafeAreaInsets {
    const style = getComputedStyle(document.documentElement);

    const parseInset = (property: string): number => {
      const value = style.getPropertyValue(property);
      return parseInt(value) || 0;
    };

    return {
      top: parseInset("env(safe-area-inset-top)"),
      bottom: parseInset("env(safe-area-inset-bottom)"),
      left: parseInset("env(safe-area-inset-left)"),
      right: parseInset("env(safe-area-inset-right)"),
    };
  }

  /**
   * Gets the appropriate button size based on device screen size
   */
  static getContextButtonSize(): number {
    const { screenSize } = this.getDeviceInfo();

    switch (screenSize) {
      case "small":
        return 56; // iPhone SE, small phones
      case "medium":
        return 64; // Standard phones
      case "large":
        return 72; // Tablets
      default:
        return 64;
    }
  }
}
