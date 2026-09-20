import { useEffect } from "react"
import { Tabs } from "expo-router"
import { Text ,View} from "react-native"
import { useTheme } from "@/hooks/useTheme"
import { useMessageStore } from "@/stores/message.store"
import { messagingService } from "@/services/messaging.service"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { useAuthStore } from "@/stores/auth.store"
export default function TabLayout() {
  // ALL hooks at top — no conditions before these
  const theme = useTheme()
  const {user}=useAuthStore()
  const {unreadMesageCount,setUnreadMessageCount}=useMessageStore()

  useEffect(()=>{
    if(!user) return
    const interval=setInterval(async()=>{
      const res= await messagingService.getUnreadCount()
      setUnreadMessageCount(res)
    },12000)
    return ()=>clearInterval(interval)
  })
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textPrimarylight,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>

               <MaterialCommunityIcons
              name="home-outline"
              size={19}
              />
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>
               <MaterialCommunityIcons
              name="magnify"
              size={19}
              />
            </Text>
          ),
        }}
      />


      <Tabs.Screen
        name="communities"
        options={{
          title: "Community",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>
              <MaterialCommunityIcons
              name="account-group"
              size={19}
              />
            </Text>
          ),
        }}
      />
       <Tabs.Screen
        name="notifications"
        options={{
          title: "Smart Communities",
          href:null,
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>
              <MaterialCommunityIcons
              name="account-group"
              size={19}
              />
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="createpost"
        options={{
          title: "Create",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>
               <MaterialCommunityIcons
              name="plus-circle-outline"
              size={35}
              color={`${theme.primary}`}
              />
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="realestate"
        options={{
          title: "Properties",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>
               <MaterialCommunityIcons
              name="bank"
              size={20}
              />
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => (
            <View>
            <Text style={{ color, fontSize: 19 }}>

               <MaterialCommunityIcons
              name="message-text"
              size={19}
              />
            </Text>
            {unreadMesageCount>0 &&(
              <View style={{
                position:"absolute",
                top:-10,
                right:-10,
                backgroundColor:"red",
                borderRadius:10,
                minWidth:18,
                height:15,
                justifyContent:"center",
                alignItems:"center",
                paddingHorizontal:4,
              }}>
                <Text style={{
                  color:"white",
                  fontSize:10,
                  fontWeight:"bold",
                }}>
                  {unreadMesageCount> 99 ?
                  "99+" :unreadMesageCount}
                </Text>
              </View>
            )}
            </View>
          ),
        }}
      />
      {/* <Tabs.Screen
        name="NewsFeedScreen"
        options={{
          title: "Updates",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>
               <MaterialCommunityIcons
              name="newspaper-variant-outline"
              size={19}
              />
            </Text>
          ),
        }}
      /> */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>

               <MaterialCommunityIcons
              name="account-circle-outline"
              size={19}
              />
            </Text>
          ),
        }}
      />
       

      
     
    </Tabs>
  )
}







