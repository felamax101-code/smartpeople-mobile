import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useTheme } from "@/hooks/useTheme"
import { useState } from "react"
import { Radius, FontSize, FontWeight, Spacing } from "@/constants/colors"
import { feedService } from "@/services/feed.service"
import { communityservice } from "@/services/community.sevice"
import { spfeedService } from "@/services/realestate.service"
import { useNotificationToast } from "../activityIndicator/ToastNotification"
import truncate from "@/hooks/useTruncateBody"
interface Props {
    isVisible: boolean,
    onClose: () => void,
    id: string,
    name:string
    isCommunity?:boolean
    isSp?:boolean
}
export default function ReportPostModal({
    isVisible,
    onClose,
    id,
    name,
    isCommunity,
    isSp
}: Props) {
    const [reportReason, setReportReason] = useState("")
    const [otherReason, setOtherReason] = useState("")
    const [isReporting, setIsReporting] = useState(false)
    const { showNotifToast } = useNotificationToast()
    const theme = useTheme()
     const REPORT_REASONS = [
    "Spam or scam", "Fake Account", "Harassment",
    "Inappropriate Content", "Inappropriate Behavior", "Impersonation", "Other",]
     const handleReportSubmit = async () => {
    if (!reportReason.trim()) return
    try {
      setIsReporting(true)
   isSp?await spfeedService.reportPost(id,reportReason,otherReason):  isCommunity?await communityservice.reportPost(id,reportReason,otherReason): await feedService.reportPost(id, reportReason, otherReason)
      onClose()
      setReportReason("")
      setOtherReason("")
      showNotifToast( "Thank you, we'll review this report.","success")
    } catch (e: any) {
      const msg = e.response?.data?.error ?? "Failed to submit report."
      showNotifToast(msg,"error")
    } finally {
      onClose()
      setIsReporting(false)
    }
  }
  
    return (
        <Modal
                visible={isVisible}
                transparent
                animationType="slide"
                onRequestClose={onClose}
              >
                <SafeAreaView style={[{flex:1}]}>
                <TouchableOpacity
                  style={styles.reportBackdrop}
                  activeOpacity={1}
                  onPress={onClose}
                />
                <View style={[styles.reportSheet, { backgroundColor: theme.surface }]}>
                  <View style={styles.reportHeader}>
                    <Text style={[styles.reportTitle, { color: theme.textPrimary }]}>
                      Report ({truncate(name,10)})
                    </Text>
                    <TouchableOpacity onPress={onClose}>
                      <Text style={[styles.reportClose, { color: theme.textMuted }]}>✕</Text>
                    </TouchableOpacity>
                  </View>
        
                  <Text style={[styles.reportSubtitle, { color: theme.textSecondary }]}>
                    Why are you reporting this post?<Text style ={[{color:theme.primary}]}>[If you recenty reported this post, do not use the same reason]</Text>
                  </Text>
        
                  {REPORT_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason}
                      style={[
                        styles.reportOption,
                        {
                          borderColor: reportReason === reason ? theme.primary : theme.border,
                          backgroundColor: reportReason === reason ? theme.primary + "15" : "transparent",
                        },
                      ]}
                      onPress={() => setReportReason(reason)}
                    >
                      <Text style={[styles.reportOptionText, { color: reportReason === reason ? theme.primary : theme.textPrimary }]}>
                        {reason}
                      </Text>
                      {reportReason === reason && <Text style={{ color: theme.primary }}>✓</Text>}
                    </TouchableOpacity>
                  ))}
        
                  {reportReason === "Other" && (
                    <TextInput
                      style={[styles.otherInput, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.border }]}
                      placeholder="Describe the issue..."
                      placeholderTextColor={theme.textPlaceholder}
                      value={otherReason}
                      onChangeText={setOtherReason}
                      multiline
                      maxLength={200}
                    />
                  )}
        
                  <TouchableOpacity
                    style={[styles.reportSubmit, { backgroundColor: reportReason ? theme.primary : theme.border }]}
                    onPress={handleReportSubmit}
                    disabled={!reportReason || isReporting}
                  >
                    {isReporting
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.reportSubmitText}>Submit Report</Text>}
                  </TouchableOpacity>
                </View>
                </SafeAreaView>
              </Modal>
    )
}

const styles = StyleSheet.create({
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