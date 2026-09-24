import { useState, useCallback, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet,ActivityIndicator, View, Text, ScrollView, TouchableOpacity, Modal, Dimensions, TextInput } from "react-native";
import { AnimatedBanner, BannerState, BannerType } from "@/components/activityIndicator/AnimatedBanner"
import { useTheme } from "@/hooks/useTheme";
import { Spacing, FontSize, FontWeight, Radius } from "@/constants/colors";
import { communityservice } from "@/services/community.sevice";
import { ActionButton } from "@/components/community/ActionButton";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import BouncingBarsIndicator from "@/components/activityIndicator/BouncingBarsIndicator";
import { addCategory, removeCategory } from "@/hooks/useCommunityMembers";
import { AxiosError } from "axios";
import { useToast } from "@/components/activityIndicator/ToastProvider";
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AddCategories() {

  const theme = useTheme()
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false)
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const [category, setCategory] = useState<string>("")
  const {showToast}=useToast()
  const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ id: Date.now(), type, message });
  }, []);
  const { data: categoriesData, isLoading, isError, refetch } = useQuery({
    queryKey: ["com-admin-categories", slug],
    queryFn: () => communityservice.getCategories(slug),
    // staleTime: 10 * 60 * 1000,
  })

  const categories = categoriesData?.data ?? []
  const { mutate:addMutate,reset:resetAdd,isSuccess:addAuccess,isError:addisError,error:addError,isPending:addPending} = addCategory(slug, category);
  const { mutate:removeMutate,reset:resetRemove,isSuccess:removeSuccess,isError:removeError,isPending:removePending} = removeCategory(slug);
 
  const handleRemove = useCallback(( id: string) => {
    showToast({
      title:"WARNING",
      message:"All POSTS BELONGING TO THIS COMMUNITY UNDER THIS CATEGORY WILL BE DELETED.THE ACTION CANNOT BE UNDONE",
      onConfirm:()=> removeMutate(id)

    })

  }, [removeCategory])
const handleAdd = useCallback(() => {
  // if (!category.trim())return
   addMutate()
  }, [addMutate])
  
  useEffect(() => {
    if (removeSuccess) {showBanner("success", "Category removed");resetRemove()}
    if (removeError)
{      showBanner("error", "Failed to remove.Something went wrong. Try again")
  resetRemove()
}  }, [removeError,removeSuccess])
   useEffect(() => {
    if (addAuccess)  {setModalVisible(false); showBanner("success", "Category added");resetAdd()}
    if (addisError){
      showBanner("error",((addError  as  AxiosError)?.response?.data as any)?.error??"Something went wrong. Try again")
      }


  }, [addError,addAuccess])
  return (

    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >

      {banner && (
        <AnimatedBanner
          key={banner.id}
          type={banner.type}
          message={banner.message}
          onHide={() => setBanner(null)}
        />
      )}

      {

        isLoading ? (
          <View style={styles.loading}>
            <BouncingBarsIndicator size="large" />
          </View>

        ) :
          isError ? (
            <View style={styles.loading}>
              <Text style={styles.errorIcon}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={25}
                  color={`${theme.textPrimary}`}
                />
              </Text>
              <Text style={[styles.errorText, { color: theme.textMuted }]}>
                Failed to load conversations
              </Text>
              <TouchableOpacity
                style={[styles.retryBtn, { borderColor: theme.primary }]}
                onPress={() => refetch()}
              >
                <Text style={[styles.retryText, { color: theme.primary }]}>
                  Try again
                </Text>
              </TouchableOpacity>
            </View>

          ) :
               categories?.length == 0 ? (
              <View style={[styles.emptyState]} >
                <Text style={styles.emptyIcon}>
                  <MaterialCommunityIcons
                    name="codepen"
                    size={25}
                    color={`${theme.textPrimary}`}
                  />
                </Text>
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                  No categories added
                </Text>

                <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                  Add categories
                </Text>
              </View>
            ) : (
              <>
                <View
                  style={[styles.header]}>
                    <MaterialCommunityIcons name="arrow-left"  size={20} color={`${theme.textPrimary}`}/>
                    
               </View>
               <Text
                    style={[styles.headerTitle,{color:theme.textPrimary}]}
                    >
                      Add or  Remove categories
                    </Text>

                <ScrollView

                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryChips}
                >
                  {categories.map((cat) => (
                    <View
                      key={cat.id}
                      style={[
                        styles.categoryChip,{backgroundColor:theme.backgroundMuted,borderColor:theme.textMuted}]}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        {color:theme.textPrimary},
                      ]}>
                        {cat.name}
                      </Text>
                      <ActionButton
                        label="remove"
                        variant="danger"
                        onPress={() => { handleRemove( cat.id) }}
                      />
                    </View>
                  ))}

                </ScrollView>

              </>
            )}

      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        activeOpacity={0.5}
      >

        <View
          style={[styles.addButton, { backgroundColor: theme.primary }]}
        >
          <Text
            style={[styles.addButtonText, { color: theme.textPrimary }]}
          >Add category</Text>
        </View>
      </TouchableOpacity>
      <Modal
        onRequestClose={() => setModalVisible(false)}
        visible={modalVisible}
        animationType="slide"
        statusBarTranslucent
        transparent
      >
         

        {/* Backdrop - tap outside to close */}
        <TouchableOpacity
          style={[styles.backdrop]}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        />
        <View style={[styles.sheet]}>
          {/* Drag handle indicator */}
          <View style={[styles.handleContainer]}>
            <View style={[styles.handle]} />
          </View>

          {/* Header */}
          <View style={[styles.header,{flexDirection:"row",justifyContent:"space-between"}]}>
            <Text style={[styles.title]} numberOfLines={1}>
              Type and add
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={[styles.closeButton]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.closeButtonText]}>✕</Text>
            </TouchableOpacity>
          </View>
          <View>
            <TextInput
              style={[
                styles.textInput, { backgroundColor: theme.inputBackground, borderColor: theme.primary, color: theme.textPrimary }]}
               onChangeText={setCategory}
              placeholder="Add..."
              placeholderTextColor={theme.textPlaceholder}
              textAlignVertical="top"
            />
                

            <ActionButton
              variant="primary"
              label="Add"
              loading={addPending}
              onPress={()=> handleAdd()}
             
            />
          </View>

        </View>


      </Modal>
    </SafeAreaView>


  )

}
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
     flexDirection: "column",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    width: 32,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    paddingLeft:60,
    marginBottom:5
  },
  textInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: FontSize.md,
    marginBottom: 20,
    marginTop: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  emptyIcon: {
    fontSize: FontSize.md,
    borderWidth: 2,
    borderRadius: Radius.lg,
    paddingHorizontal: 4,
    lineHeight: 20
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,

    height: SCREEN_HEIGHT * 0.75,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1D1D6',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  closeButtonText: {
    fontSize: 15,
    color: '#3C3C43',
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: "center",
  },
  modalTitle: {

  },
  emptySub: {
    fontSize: FontSize.md,
    textAlign: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    flexShrink: 1,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  addButton: {
   
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    marginBottom: 60,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  addButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  categoryIcon: { fontSize: 14 },
  categoryChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  categoryChips: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  errorText: {
    fontSize: FontSize.sm,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  retryBtn: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  retryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

})