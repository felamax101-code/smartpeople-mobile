

import { useState } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,

} from "react-native"
import { useTheme } from "@/hooks/useTheme"
import { User } from "@/types"
import { feedService } from "@/services/feed.service"
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/colors"
import { BannerType } from "../activityIndicator/AnimatedBanner"
import { MaterialIcons } from "@expo/vector-icons"
import ReportUserModal from "../reportuser/ReportModal"
interface Props {
  profile: any
  isOwn: boolean
  showBanner?: (type: BannerType, message: string) => (void)
}

// verification level descriptions
const LEVEL_INFO = [
  {
    level: 1,
    icon: <MaterialIcons name="mark-email-read" size={20} />,
    label: "Email Verified",
    description: "Email address confirmed",
  },
  {
    level: 2,
    icon: <MaterialIcons name="smartphone" size={20} />,
    label: "Phone Verified",
    description: "Phone number confirmed",
  },
  {
    level: 3,
    icon: <MaterialIcons name="badge" size={20} />,
    label: "ID Verified",
    description: "Government ID confirmed",
  },
  {
    level: 4,
    icon: <MaterialIcons name="business" size={20} />,
    label: "Business Verified",
    description: "Business registration confirmed",
  },
]

export const AboutTab = ({ profile, isOwn, showBanner }: Props) => {
  const theme = useTheme()


  const [showReportModal, setShowReportModal] = useState(false)



  const formatTimeAgo = (dateString: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
    if (seconds < 60) return "just now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}minutes ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}hours ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}days ago`
    return new Date(dateString).toLocaleDateString()
  }


  return (
    <View style={styles.container}>

      {/* ── verification section  */}
      {/* <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Trust & Verification
        </Text>

        {LEVEL_INFO.map((info) => {
          const earned = profile.verification_level >= info.level
          return (
            <View
              key={info.level}
              style={[
                styles.verificationRow,
                {
                  backgroundColor: earned
                    ? theme.successLight
                    : theme.surfaceSecondary,
                  borderColor: earned
                    ? Colors.success
                    : theme.border,
                },
              ]}
            >
              <Text style={styles.verificationIcon}>{info.icon}</Text>
              <View style={styles.verificationInfo}>
                <Text style={[
                  styles.verificationLabel,
                  { color: earned ? Colors.success : theme.textMuted }
                ]}>
                  {info.label}
                </Text>
                <Text style={[styles.verificationDesc, { color: theme.textMuted }]}>
                  {info.description}
                </Text>
              </View>
              <Text style={[
                styles.verificationStatus,
                { color: earned ? Colors.success : theme.textMuted }
              ]}>
                {earned ? <MaterialIcons name="check-circle" size={12}/> : <MaterialIcons name="close" color={"red"} size={12}/>}
              </Text>
            </View>
          )
        })}

       
        {isOwn && profile.verification_level < 4 && (
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: theme.primaryLight }]}
            onPress={() =>{
              if (profile.verification_level==1){
                router.push({
                 pathname: "/settings/edit-profile",
                params:{
                  tab:"phone"
                }
                })
              }else if (profile.verification_level==2){
              router.push("/settings/verification/identity")}
            else if (profile.verification_level==3){
              router.push("/settings/verification/business")
            }}}
          >
            <Text style={[styles.upgradeText, { color: theme.primary }]}>
              🚀 Upgrade to Level {profile.verification_level + 1}
            </Text>
          </TouchableOpacity>
        )}
      </View> */}

      {/* ── account info ──────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Account Info
        </Text>

        <View style={[styles.infoTable, { borderColor: theme.border }]}>
          {[
            {
              label: "Member since",
              value: formatTimeAgo(profile.created_at),
            },
            {
              label: "Total posts",
              value: String(profile.total_posts),
            },
            {
              label: "Role",
              value: profile.role.charAt(0).toUpperCase() + profile.role.slice(1),
            },
          ].map((row, index, arr) => (
            <View
              key={row.label}
              style={[
                styles.infoRow,
                {
                  borderBottomColor: theme.border,
                  borderBottomWidth: index < arr.length - 1 ? 1 : 0,
                  backgroundColor:
                    index % 2 === 0
                      ? theme.surfaceSecondary
                      : theme.surface,
                },
              ]}
            >
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                {row.label}
              </Text>
              <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── report button (other user only) ──────────────── */}

      {!isOwn && (
        <TouchableOpacity
          style={[styles.reportButton, { borderColor: theme.error }]}
          onPress={() => setShowReportModal(true)}
        >
          <Text style={[styles.reportText, { color: theme.error }]}>
            🚩 Report @{profile.username}
          </Text>
        </TouchableOpacity>
      )}



      <ReportUserModal
        isVisible={showReportModal}
        username={profile.username}
        onClose={() => setShowReportModal(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.2,
  },
  verificationRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  verificationIcon: {
    fontSize: 24,
  },
  verificationInfo: {
    flex: 1,
    gap: 2,
  },
  verificationLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  verificationDesc: {
    fontSize: FontSize.xs,
  },
  verificationStatus: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  upgradeButton: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  upgradeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  infoTable: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  infoLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  infoValue: {
    flex: 2,
    fontSize: FontSize.sm,
    textTransform: "capitalize",
  },
  reportButton: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  reportText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },





  reportBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  reportSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  reportTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  reportClose: {
    fontSize: 18,
    fontWeight: FontWeight.bold,
    padding: 4,
  },
  reportSubtitle: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
  },
  reportOption: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reportOptionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  otherInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    minHeight: 80,
    marginTop: Spacing.xs,
  },
  reportSubmit: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  reportSubmitText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  }
})












