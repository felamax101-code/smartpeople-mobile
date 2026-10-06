// utils/parseText.tsx
import React from "react";
import { Text } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { FontSize } from "@/constants/colors";

const PATTERN = /(https?:\/\/[^\s]+)|(#\w+)|(@\w+)/g;

export function parseText(text: string) {
  const parts = text.split(PATTERN).filter(Boolean);

  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <Text
          key={i}
          suppressHighlighting
          style={{ color: "#59427c", fontSize: FontSize.md, fontWeight: "900" }}
          onPress={() => WebBrowser.openBrowserAsync(part)}
        >
          {part}
        </Text>
      );
    }

    if (/^#\w+/.test(part)) {
      const tag = part.slice(1);
      return (
        <Text
          key={i}
          suppressHighlighting
          style={{ color: "#59427c", fontSize: FontSize.md, fontWeight: "900" }}
          onPress={() =>
            router.push({ pathname: "/search", params: { search: tag } })
          }
        >
          {part}
        </Text>
      );
    }

    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}