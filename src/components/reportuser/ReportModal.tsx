import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useTheme } from "@/hooks/useTheme"
import { useState } from "react"
import { Radius, FontSize, FontWeight, Spacing } from "@/constants/colors"
import { feedService } from "@/services/feed.service"
import { useNotificationToast } from "../activityIndicator/ToastNotification"
interface Props {
    isVisible: boolean,
    onClose: () => void,
    username: string
}
export default function ReportUserModal({
    isVisible,
    onClose,
    username
}: Props) {
    const [reportReason, setReportReason] = useState("")
    const [otherReason, setOtherReason] = useState("")
    const [isReporting, setIsReporting] = useState(false)
    const { showNotifToast } = useNotificationToast()
    const theme = useTheme()
    const REPORT_REASONS = [
        "Spam or scam",
        "Fake Account",
        "Harassment",
        "Inappropriate Content",
        "Inappropriate Behavior",
        "Impersonation",
        "Other",
    ]
    const handleReportSubmit = async () => {
        const reason = reportReason
        if (!reason.trim()) return

        try {
            setIsReporting(true)
            await feedService.reportUser(username, reason, otherReason)
            onClose()
            setReportReason("")
            setOtherReason("")
            showNotifToast("Thank you, we'll review this report.", "success")
        } catch (e) {
            showNotifToast("Failed to submit report. Try again.", "error")
        } finally {
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

                {/* header */}
                <View style={styles.reportHeader}>
                    <Text style={[styles.reportTitle, { color: theme.textPrimary }]}>
                        Report @{username}
                    </Text>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={[styles.reportClose, { color: theme.textMuted }]}>✕</Text>
                    </TouchableOpacity>
                </View>

                <Text style={[styles.reportSubtitle, { color: theme.textSecondary }]}>
                    Why are you reporting this user?
                </Text>

                {/* reason options */}
                {REPORT_REASONS.map((reason) => (
                    <TouchableOpacity
                        key={reason}
                        style={[
                            styles.reportOption,
                            {
                                borderColor: reportReason === reason ? theme.primary : theme.border,
                                backgroundColor: reportReason === reason
                                    ? theme.primary + "15"
                                    : "transparent",
                            },
                        ]}
                        onPress={() => setReportReason(reason)}
                    >
                        <Text style={[
                            styles.reportOptionText,
                            { color: reportReason === reason ? theme.primary : theme.textPrimary }
                        ]}>
                            {reason}
                        </Text>
                        {reportReason === reason && (
                            <Text style={{ color: theme.primary }}>✓</Text>
                        )}
                    </TouchableOpacity>
                ))}

                {/* other input */}
                {reportReason === "Other" && (
                    <TextInput
                        style={[styles.otherInput, {
                            color: theme.textPrimary,
                            backgroundColor: theme.inputBackground,
                            borderColor: theme.border,
                        }]}
                        placeholder="Describe the issue..."
                        placeholderTextColor={theme.textPlaceholder}
                        value={otherReason}
                        onChangeText={setOtherReason}
                        multiline
                        maxLength={200}
                    />
                )}

                {/* submit */}
                <TouchableOpacity
                    style={[
                        styles.reportSubmit,
                        {
                            backgroundColor: reportReason ? theme.primary : theme.border,
                        },
                    ]}
                    onPress={handleReportSubmit}
                    disabled={!reportReason || isReporting}
                >
                    {isReporting
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.reportSubmitText}>Submit Report</Text>
                    }
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