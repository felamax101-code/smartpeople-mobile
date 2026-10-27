import { useState, useRef, useEffect, useCallback } from "react"
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  PanResponder,
} from "react-native"
import { VideoView, useVideoPlayer } from "expo-video"
import { useFocusEffect, useRouter } from "expo-router"
import { PostImage, PostVideo } from "@/types"
import { Colors, FontSize, FontWeight, Radius } from "@/constants/colors"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { useTheme } from "@/hooks/useTheme"
import { useEvent } from "expo"
import { useEventListener } from "expo"
import { CarouselSound } from "./SoundPlayer"
import { ToastProvider } from "../activityIndicator/ToastProvider"
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window")

export const CARD_HEIGHT = SCREEN_HEIGHT * 0.60

const SPEEDS = [0.5, 1, 1.5, 2]

interface Props {
  images: PostImage[]
  isVisible: boolean
  video: PostVideo[]
  isDetail?: boolean//determining if screen height is full
  isScreenFocused?: boolean // pass useFocusEffect result from parent if nested
  slug: string
  isGroup?: boolean
  isSP?: boolean
  location?: string | null
  price?: string | null
  deposit?: string | null
  installments?: string | null
  listing_type?: string | null
  onActiveMediaChange?: (
    item: { type: "image" | "video"; url: string } | null,
    index: number
  ) => void
  communityslug?: string
  sound_url?: string
  onVideoDuration?: (s: number) => void
}

export const ImageCarousel = ({
  isVisible,
  images,
  video,
  isDetail,
  isGroup = false,
  slug,
  isSP = false,
  location,
  sound_url,
  price,
  listing_type,
  deposit,
  installments,
  communityslug,
  onActiveMediaChange,
  onVideoDuration
}: Props) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollRef = useRef<ScrollView>(null)
  const [isFocused, setIsFocused] = useState(true)
  const theme = useTheme()
  const router = useRouter()

  // pause all videos when screen loses focus (navigating away)
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true)
      return () => setIsFocused(false)
    }, [])
  )
  //if videos + images are received -join them
  const mediaItems = [
    ...(video || [])
      .filter((v) => !!v.video?.trim())
      .map((v) => ({ type: "video" as const, url: v.video })),
    ...(images || [])
      .filter((img) => !!img.image?.trim())
      .map((img) => ({ type: "image" as const, url: img.image })),
  ]

  const totalItems = mediaItems.length

  const goTo = (index: number) => {
    if (index < 0 || index >= totalItems) return
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true })
    setCurrentIndex(index)
  }

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
    setCurrentIndex(index)
  }
  const handlePress = useCallback(() => {
    router.push({
      pathname: isGroup ? `/community/post/${slug}` : isSP ? `/sp/post/${slug}` : `/post/${slug}` as any,
      params: {
        communityslug: communityslug,
      }

    })
  }, [slug])
  useEffect(() => {
    onActiveMediaChange?.(mediaItems[currentIndex] ?? null, currentIndex)
  }, [currentIndex, mediaItems.length]) // eslint-disable-line react-hooks/exhaustive-deps
  if (totalItems === 0) {

    return (
      <View style={[styles.container, { height: isDetail ? SCREEN_HEIGHT : CARD_HEIGHT, backgroundColor: "black", alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: "#fff" }}>No media available</Text>
      </View>
    )
  }
  return (
    <View style={[styles.container, { height: isDetail ? SCREEN_HEIGHT : CARD_HEIGHT }]}>


      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
      >

        {mediaItems.map((item, index) => (
          <View key={index} style={[styles.mediaItem, { height: isDetail ? SCREEN_HEIGHT : CARD_HEIGHT, backgroundColor: "black", borderColor: theme.borderMuted }]}>
            {item.type === "video" ? (
              <VideoMedia
                url={item.url}
                isActive={index === currentIndex && isFocused && isVisible}
                isDetail={isDetail ?? false}
                slug={slug}
                isGroup={isGroup}
                isSP={isSP}
                communityslug={communityslug}
                onVideoDuration={onVideoDuration}
              />
            ) : (
              <Image
                source={{ uri: item.url }}
                style={styles.image}
                resizeMode={isDetail ? "contain" : "cover"}
              />
            )}
            {isSP && location && (
              <View
                style={[{
                  position: "absolute", flexDirection: "row", top: isDetail ? 80 : 8, right: 8, backgroundColor: "white", borderRadius: Radius.md, paddingHorizontal: 3,
                  borderWidth: 1, borderColor: theme.success, height: isDetail ? 30 : undefined

                }]}

              >

                <Text style={[{ color: theme.primary, fontSize: FontSize.md, fontWeight: FontWeight.extrabold }]} >

                  📌{" "}{location} </Text>
                <View
                  style={[{
                    position: "absolute", flexDirection: "row", bottom: isDetail ? -40 : -25, right: 8, backgroundColor: theme.inputBackgroundFocus, borderRadius: Radius.md, paddingHorizontal: 3,
                    borderWidth: 1, borderColor: theme.success, height: isDetail ? 30 : undefined

                  }]}

                >

                  <Text style={[{ color: "white", fontSize: FontSize.md, fontWeight: FontWeight.extrabold }]} >

                    {listing_type == "rental" ? "Rental" : "For Sale"} {listing_type === "sale" ? `Deposit:${deposit}` : null} - KES{" "} {listing_type === "rental" ? price : installments}{" "} p.m </Text>

                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* gradient overlay */}
      <View style={styles.gradientOverlay} pointerEvents="none" />
      {/* navigation arrows */}
      {totalItems > 1 && (
        <>
          {currentIndex > 0 && (
            <TouchableOpacity
              style={[styles.arrow, styles.arrowLeft]}
              onPress={() => goTo(currentIndex - 1)}
              activeOpacity={0.8}
            >
              <Text style={styles.arrowText}>

                <MaterialCommunityIcons name="chevron-left-circle-outline" size={23} color="#fff" />
              </Text>
            </TouchableOpacity>
          )}
          {currentIndex < totalItems - 1 && (
            <TouchableOpacity
              style={[styles.arrow, styles.arrowRight]}
              onPress={() => goTo(currentIndex + 1)}
              activeOpacity={0.8}
            >
              <Text style={styles.arrowText}>
                <MaterialCommunityIcons name="chevron-right-circle-outline" size={23} color="#fff" />
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* counter + dots */}
      {mediaItems[0].type === "image" && (
        <View style={styles.counterContainer}>

          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {totalItems}
            </Text>
            {!isDetail && <TouchableOpacity


              onPress={handlePress}
              style={[styles.fullscreen, { position: "absolute", right: -120, alignItems: "center", justifyContent: "flex-end" }]}>
              <Text style={styles.counterText}>
                <MaterialCommunityIcons size={20} name="fullscreen" />Full Screen
              </Text>
            </TouchableOpacity>}
          </View>
          <View style={styles.dots}>
            {mediaItems.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => goTo(i)}>
                <View style={[styles.dot, i === currentIndex && styles.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>

        </View>
      )}
      {sound_url && mediaItems[0]?.type === "image" && (
        <CarouselSound
          url={sound_url}
          isActive={isFocused && isVisible}
          isDetail={!!isDetail}
          top={isDetail ? 80 : 8}
        />
      )}
    </View>
  )
}

// ─── VideoMedia 

const VideoMedia = ({ url, isActive, isDetail, slug, isGroup, isSP, communityslug, onVideoDuration }: { url: string; isActive: boolean, isDetail: boolean, slug: string, isGroup: boolean, isSP: boolean, communityslug: string | undefined, onVideoDuration?: (s: number) => void }) => {
  const [isMuted, setIsMuted] = useState(true)
  const [isDetailMuted, setIsDetailMuted] = useState(false)
  const [speedIndex, setSpeedIndex] = useState(1)           // default 1x
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(0)
  const [seeking, setSeeking] = useState(false)
  const seekBarWidth = useRef(SCREEN_WIDTH - 32)
  const [isPlaying, setIsPlaying] = useState(false)
  const [status, setStatus] = useState<string>("idle")

  const router = useRouter()
  const handlePress = useCallback(() => {
    router.push({
      pathname: isGroup ? `/community/post/${slug}` as any : isSP ? `/sp/post/${slug}` : `/post/${slug}` as any,
      params: {
        communityslug: communityslug,
      }

    })
  }, [slug])
  const player = useVideoPlayer(url, (p: any) => {
    p.loop = true
    p.muted = false
    p.playbackRate = SPEEDS[1]
    p.timeUpdateEventInterval = 0.5

  })

  useEventListener(player, "playingChange", ({ isPlaying }) => {
    setIsPlaying(isPlaying) // same value = React bails out, no loop
  })

  useEventListener(player, "statusChange", ({ status }) => {
    setStatus(status)
    if (status === "readyToPlay") setDuration(player.duration ?? 0)
  })
  useEffect(() => {
    if (isActive && duration > 0) onVideoDuration?.(duration)
  }, [isActive, duration])
  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    if (seeking) return
    setPosition((prev) => (Math.abs(prev - currentTime) > 0.25 ? currentTime : prev))
  })
  useEffect(() => {
    if (isActive) {
      player.play()
    } else {
      player.pause()
    }
  }, [isActive])

  // sync mute
  useEffect(() => {
    player.muted = isDetail ? isDetailMuted : isMuted
  }, [isMuted, isDetail, player, isDetailMuted])

  // sync speed
  useEffect(() => {
    player.playbackRate = SPEEDS[speedIndex]
  }, [speedIndex, player])

  // poll position every 500ms
  // position now comes from the timeUpdate event, not a poll
  // useEffect(() => {
  //   if (!seeking && timeUpdate?.currentTime != null) {
  //     setPosition(timeUpdate.currentTime)
  //   }
  // }, [timeUpdate, seeking])

  // duration becomes known once the player is ready
  // useEffect(() => {
  //   if (status === "readyToPlay") {
  //     setDuration(player.duration ?? 0)
  //   }
  // }, [status])

  const cycleSpeed = () => setSpeedIndex((i) => (i + 1) % SPEEDS.length)

  const seek = (dx: number) => {
    if (!duration) return
    const ratio = Math.max(0, Math.min(1, dx / seekBarWidth.current))
    const newTime = ratio * duration
    setPosition(newTime)
    player.currentTime = newTime
  }

  const skipSeconds = (secs: number) => {
    const newTime = Math.max(0, Math.min(duration, position + secs))
    setPosition(newTime)
    player.currentTime = newTime
  }

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      setSeeking(true)
      seek(e.nativeEvent.locationX)
    },
    onPanResponderMove: (e) => seek(e.nativeEvent.locationX),
    onPanResponderRelease: () => setSeeking(false),
  })

  const progress = duration > 0 ? position / duration : 0
  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
  }
  if (status === "error") {
    return (
      <View style={[styles.image, { alignItems: "center", justifyContent: "center", backgroundColor: "black" }]}>
        <Text style={{ color: "#fff" }}>
          <MaterialCommunityIcons size={20} name="alert-circle-outline" /> Video unavailable
        </Text>
      </View>
    )
  }
  return (
    <View style={{ flex: 1 }}>
      <VideoView
        player={player}
        style={styles.image}
        contentFit={isDetail ? "contain" : "cover"}
        nativeControls={false}
      />

      {/* ── video controls overlay ── */}
      {
        <View style={[vc.overlay, { paddingBottom: isDetail ? 110 : 12, }]} pointerEvents="box-none">

          {/* centre row: skip-back | play-pause | skip-forward */}
          <View style={[vc.centreRow]}>
            <TouchableOpacity style={vc.iconBtn} onPress={() => skipSeconds(-10)}>
              <Text style={vc.iconText}>
                <MaterialCommunityIcons size={15} name="rewind-10" />
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={vc.playBtn}
              activeOpacity={0.6}
              onPress={() => (isPlaying ? player.pause() : player.play())}
            >
              <Text style={vc.playText}>
                {isPlaying ? <MaterialCommunityIcons size={20} name="pause-circle-outline" /> : <MaterialCommunityIcons size={20} name="play-circle-outline" />}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={vc.iconBtn} onPress={() => skipSeconds(10)}>
              <Text style={vc.iconText}>
                <MaterialCommunityIcons size={15} name="fast-forward-10" />
              </Text>
            </TouchableOpacity>
            {isDetail && <TouchableOpacity style={vc.iconBtn} activeOpacity={0.7} onPress={() => setIsDetailMuted((m) => !m)}>
              <Text style={vc.iconText}>{isDetailMuted ? <MaterialCommunityIcons size={15} name="volume-mute" /> : <MaterialCommunityIcons size={15} name="volume-high" />}</Text>
            </TouchableOpacity>
            }

            {!isDetail && <TouchableOpacity
              activeOpacity={0.6}
              style={vc.fullscreen}
              onPress={handlePress}
            >
              <Text style={[{ color: "white", fontWeight: FontWeight.bold }]} > <MaterialCommunityIcons size={20} name="fullscreen" />Full Screen</Text>
            </TouchableOpacity>}
          </View>

          {/* bottom: seek bar + time + mute + speed */}
          <View style={[vc.bottomBar, { paddingRight: isDetail ? 50 : undefined }]}>
            {/* seek bar */}
            <View
              style={[{ flex: 1, height: 30, backgroundColor: "transparent" }]}
              {...panResponder.panHandlers}
              onLayout={(e) => { seekBarWidth.current = e.nativeEvent.layout.width }}
            >
              <View
                style={vc.seekBarTrack}
                // {...panResponder.panHandlers}
                onLayout={(e) => { seekBarWidth.current = e.nativeEvent.layout.width }}
              >
                <View style={[vc.seekBarFill, { width: `${progress * 100}%` }]} />
                <View style={[vc.seekThumb, { left: `${progress * 100}%` as any }]} />
              </View>
            </View>

            {/* time */}
            <Text style={vc.timeText}>{fmt(position)} / {fmt(duration)}</Text>

            {/* mute */}
            {!isDetail && <TouchableOpacity style={vc.iconBtn} activeOpacity={0.7} onPress={() => setIsMuted((m) => !m)}>
              <Text style={vc.iconText}>{isMuted ? <MaterialCommunityIcons size={15} name="volume-mute" /> : <MaterialCommunityIcons size={15} name="volume-high" />}</Text>
            </TouchableOpacity>}

            {/* speed */}
            <TouchableOpacity style={vc.speedBtn} onPress={cycleSpeed}>
              <Text style={vc.speedText}>{SPEEDS[speedIndex]}x</Text>
            </TouchableOpacity>
          </View>
        </View>}
    </View>
  )
}

// ─── Styles 

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
  },
  mediaItem: {
    width: SCREEN_WIDTH,
    borderWidth: 0.5,
    borderRadius: Radius.lg,
    borderColor: "#fff",
    overflow: "hidden"
  },
  image: {
    width: "100%",
    height: "100%",
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFill,
    top: "50%",
    backgroundColor: "transparent",
    opacity: 0.5,
  },



  arrow: {
    position: "absolute",
    top: "50%",
    marginTop: -24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowLeft: { left: 12 },
  arrowRight: { right: 12 },
  arrowText: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: "300",
    lineHeight: 32,
  },
  counterContainer: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 8,
  },
  counter: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  counterText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  dots: { flexDirection: "row", gap: 6 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: {
    backgroundColor: Colors.white,
    width: 18,
  },
  fullscreen: {
    borderRadius: 26,
    paddingVertical: 2,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2

  },
})

const vc = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "flex-end",

  },
  centreRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    marginBottom: 12,
  },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreen: {
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 1

  },
  playText: { color: "#fff", },
  iconBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 20,
  },
  iconText: { color: "#fff" },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,

    gap: 8,
  },
  seekBarTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    position: "relative",
    justifyContent: "center",
  },
  seekBarFill: {
    height: 4,
    backgroundColor: Colors.white ?? "#fff",
    borderRadius: 2,
  },
  seekThumb: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
    top: -4,
    marginLeft: -6,
  },
  timeText: { color: "#fff", fontSize: 10, fontWeight: "500", minWidth: 72 },
  speedBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
  },
  speedText: { color: "#fff", fontSize: 11, fontWeight: "700" },
})
