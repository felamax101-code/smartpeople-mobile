// utils/parseText.tsx
import React from "react";
import { Text, TouchableOpacity } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { FontSize,FontWeight } from "@/constants/colors";
const PATTERN = /(https?:\/\/[^\s]+)|(#[\w]+)|(@[\w]+)/g;

export function parseText(text: string) {
  const parts = text.split(PATTERN).filter(Boolean);

  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <TouchableOpacity
          key={i}
          onPress={(e) => {
            e.stopPropagation();
            WebBrowser.openBrowserAsync(part)}}
        >
          <Text style={[{ color: "#5405ca", fontSize:FontSize.md,fontWeight:"900"}]}>{part}</Text>
        </TouchableOpacity>
      );
    }
    if (/^#\w+/.test(part)) {
      const tag = part.slice(1);
      return (
        <TouchableOpacity 
        key={i}
        activeOpacity={0.7} 
        onPress={(e)=>{
          e.stopPropagation();
          router.push({
          pathname:`/search`,
          params:{
            search:tag
          }
          
        });
      
      }
      }
        >
          <Text style={[{ color: "#4309f1" ,fontSize:FontSize.md,fontWeight:"900"}]}>{part}</Text>
        </TouchableOpacity>
      );
    }
    // if (/^@\w+/.test(part)) {
    //   const username = part.slice(1);
    //   return (
    //     <Link key={i} href={`/profileid/${username}`} className="text-app-primary hover:underline">
    //       {part}
    //     </Link>
    //   );
    // }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}