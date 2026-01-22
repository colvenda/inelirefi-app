import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, 
  SafeAreaView, Alert, ActivityIndicator, Image, Modal, RefreshControl, 
  KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

// --- FIREBASE ---
import { db, auth } from './firebaseConfig';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  doc, deleteDoc, serverTimestamp, setDoc, updateDoc,
  arrayUnion, arrayRemove
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';

const CODIGO_DOCENTE = "INELI2026";
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dnvvvgwco/image/upload';
const UPLOAD_PRESET = 'INELIREFI'; 

// ---------------------------------------------------------
// FUNCIONES DE APOYO (HELPERS)
// ---------------------------------------------------------
const traducirError = (code) => {
  switch (code) {
    case 'auth/invalid-email': return "El formato del correo es inválido.";
    case 'auth/user-not-found': return "No existe una cuenta con este correo.";
    case 'auth/wrong-password': return "Contraseña incorrecta.";
    case 'auth/email-already-in-use': return "Este correo ya está registrado.";
    case 'auth/weak-password': return "La contraseña debe tener al menos 6 caracteres.";
    default: return "Ocurrió un error inesperado. Inténtalo de nuevo.";
  }
};

// ---------------------------------------------------------
// 1. PANTALLA DE ACCESO (REDISEÑO TECNOLÓGICO)
// ---------------------------------------------------------
function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState('Estudiante');
  const [secretCode, setSecretCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) return Alert.alert("Faltan datos", "Por favor llena todos los campos.");
    if (isRegistering && !nombre) return Alert.alert("Nombre requerido", "Necesitamos saber quién eres.");
    if (isRegistering && role === 'Profe' && secretCode !== CODIGO_DOCENTE) {
      return Alert.alert("Código Inválido", "El código de docente no es correcto.");
    }

    setLoading(true);
    try {
      if (isRegistering) {
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(doc(db, "usuarios", userCred.user.uid), {
          nombre: nombre, email: email.trim(), rol: role, cargo: "Ninguno", photoURL: "", createdAt: serverTimestamp()
        });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (error) {
      Alert.alert("Error de Acceso", traducirError(error.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.authContainer}>
      <View style={styles.authCard}>
        <View style={styles.authHeader}>
          <View style={styles.techIcon}>
            <Ionicons name="shield-checkmark" size={40} color="#fff" />
          </View>
          <Text style={styles.authTitle}>{isRegistering ? "Registro Digital" : "INELI 2026"}</Text>
          <Text style={styles.authSubtitle}>{isRegistering ? "Crea tu cuenta institucional" : "Bienvenido al portal escolar"}</Text>
        </View>

        <View style={styles.form}>
          {isRegistering && (
            <View style={styles.inputBox}>
              <Ionicons name="person-outline" size={20} color="#64748B" />
              <TextInput style={styles.modernInput} placeholder="Nombre Completo" placeholderTextColor="#94A3B8" value={nombre} onChangeText={setNombre} />
            </View>
          )}

          <View style={styles.inputBox}>
            <Ionicons name="mail-outline" size={20} color="#64748B" />
            <TextInput style={styles.modernInput} placeholder="Correo Institucional" placeholderTextColor="#94A3B8" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"/>
          </View>

          <View style={styles.inputBox}>
            <Ionicons name="lock-closed-outline" size={20} color="#64748B" />
            <TextInput style={styles.modernInput} placeholder="Contraseña" placeholderTextColor="#94A3B8" value={password} onChangeText={setPassword} secureTextEntry />
          </View>

          {isRegistering && (
            <View style={styles.roleWrapper}>
              <View style={styles.roleTabs}>
                <TouchableOpacity onPress={()=>setRole('Estudiante')} style={[styles.roleTab, role==='Estudiante' && styles.activeTab]}>
                  <Text style={[styles.roleTabText, role==='Estudiante' && styles.activeRoleText]}>Estudiante</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=>setRole('Profe')} style={[styles.roleTab, role==='Profe' && styles.activeTab]}>
                  <Text style={[styles.roleTabText, role==='Profe' && styles.activeRoleText]}>Docente</Text>
                </TouchableOpacity>
              </View>
              {role === 'Profe' && <TextInput style={styles.secretInput} placeholder="Código Docente" placeholderTextColor="#ef4444" value={secretCode} onChangeText={setSecretCode} secureTextEntry/>}
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#4b7bec" style={{marginVertical: 20}} />
          ) : (
            <TouchableOpacity style={styles.modernBtn} onPress={handleAuth}>
              <Text style={styles.modernBtnText}>{isRegistering ? "CREAR IDENTIDAD" : "ACCEDER"}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)} style={styles.switchLink}>
            <Text style={styles.switchText}>
              {isRegistering ? "¿Ya eres parte? " : "¿Nuevo ingreso? "}
              <Text style={styles.linkBlue}>{isRegistering ? "Inicia sesión" : "Regístrate"}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------
// 2. PANTALLA CARTELERA
// ---------------------------------------------------------
function CarteleraScreen({ userData }) {
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [commentText, setCommentText] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const esAutorizado = userData.rol === 'Profe' || userData.cargo === 'Personero';

  const fetchPosts = useCallback(() => {
    setRefreshing(true);
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setRefreshing(false);
    });
  }, []);

  useEffect(() => { return fetchPosts(); }, [fetchPosts]);

  const publicarAnuncio = async () => {
    if (!text.trim()) return;
    await addDoc(collection(db, "posts"), {
      texto: text,
      autor: userData.nombre,
      autorId: auth.currentUser.uid,
      rol: userData.cargo !== "Ninguno" ? userData.cargo : userData.rol,
      likes: [],
      comentarios: [],
      createdAt: serverTimestamp()
    });
    setText('');
    Alert.alert("Anuncio Enviado", "La comunidad ha sido notificada.");
  };

  const handleLike = async (postId, currentLikes = []) => {
    const userId = auth.currentUser.uid;
    const postRef = doc(db, "posts", postId);
    if (currentLikes.includes(userId)) {
      await updateDoc(postRef, { likes: arrayRemove(userId) });
    } else {
      await updateDoc(postRef, { likes: arrayUnion(userId) });
    }
  };

  const agregarComentario = async (postId) => {
    if (!commentText[postId]?.trim()) return;
    const nuevoComentario = {
      texto: commentText[postId],
      autor: userData.nombre,
      rol: userData.rol,
      fecha: new Date().toISOString()
    };
    await updateDoc(doc(db, "posts", postId), {
      comentarios: arrayUnion(nuevoComentario)
    });
    setCommentText({ ...commentText, [postId]: '' });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList 
        data={posts} 
        keyExtractor={item => item.id} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchPosts} colors={['#4b7bec']} />}
        ListHeaderComponent={esAutorizado && (
          <View style={styles.headerCartelera}>
            <Text style={styles.labelAdmin}>COMUNICADO OFICIAL</Text>
            <TextInput 
              style={styles.inputCartelera} 
              placeholder="¿Qué quieres anunciar hoy?" 
              placeholderTextColor="#94A3B8"
              value={text} 
              onChangeText={setText} 
              multiline 
            />
            <TouchableOpacity onPress={publicarAnuncio} style={styles.btnAnuncio}>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.btnAnuncioText}>PUBLICAR</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={[styles.card, item.rol === 'Personero' && styles.cardPersonero]}>
            <View style={styles.cardHeader}>
               <View style={[styles.avatar, {backgroundColor: item.rol === 'Profe' ? '#eb3b5a' : (item.rol === 'Personero' ? '#f1c40f' : '#4b7bec')}]}>
                 <Ionicons name={item.rol === 'Profe' ? "briefcase" : "star"} size={16} color="#fff" />
               </View>
               <View>
                 <Text style={styles.cardAutor}>{item.autor}</Text>
                 <Text style={styles.cardRol}>{item.rol.toUpperCase()}</Text>
               </View>
               {esAutorizado && (
                <TouchableOpacity style={{marginLeft:'auto'}} onPress={() => deleteDoc(doc(db, "posts", item.id))}>
                  <Ionicons name="trash-outline" size={18} color="#CBD5E1" />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.postTexto}>{item.texto}</Text>
            
            <View style={styles.actionsContainer}>
              <TouchableOpacity onPress={() => handleLike(item.id, item.likes)} style={styles.actionBtn}>
                <Ionicons name={item.likes?.includes(auth.currentUser.uid) ? "heart" : "heart-outline"} size={22} color="#eb3b5a" />
                <Text style={styles.actionText}>{item.likes?.length || 0}</Text>
              </TouchableOpacity>
              <View style={styles.actionBtn}>
                <Ionicons name="chatbubbles-outline" size={20} color="#4b7bec" />
                <Text style={styles.actionText}>{item.comentarios?.length || 0}</Text>
              </View>
            </View>

            <View style={styles.commentSection}>
              {item.comentarios?.slice(-2).map((c, i) => (
                <View key={i} style={styles.commentBubble}>
                  <Text style={styles.commentText}><Text style={{fontWeight:'700'}}>{c.autor}:</Text> {c.texto}</Text>
                </View>
              ))}
              <View style={styles.miniInputContainer}>
                <TextInput 
                  style={styles.miniInput} 
                  placeholder="Escribe un comentario..." 
                  value={commentText[item.id] || ''}
                  onChangeText={(v) => setCommentText({...commentText, [item.id]: v})}
                />
                <TouchableOpacity onPress={() => agregarComentario(item.id)}>
                  <Ionicons name="chevron-forward-circle" size={24} color="#4b7bec" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )} 
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------
// 3. PANTALLA BUZÓN
// ---------------------------------------------------------
function BuzonScreen({ userData }) {
  const [msg, setMsg] = useState('');
  const [lista, setLista] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const esAdminBuzon = userData.cargo === 'Personero' || userData.rol === 'Profe';

  const fetchSugerencias = useCallback(() => {
    if (!esAdminBuzon) return;
    setRefreshing(true);
    const q = query(collection(db, "sugerencias"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setLista(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setRefreshing(false);
    });
  }, [esAdminBuzon]);

  useEffect(() => { return fetchSugerencias(); }, [fetchSugerencias]);

  const enviar = async () => {
    if (!msg.trim()) return;
    await addDoc(collection(db, "sugerencias"), { 
      texto: msg, autor: userData.nombre, uid: auth.currentUser.uid, createdAt: serverTimestamp() 
    });
    setMsg('');
    Alert.alert("Enviado con éxito", "Tu propuesta ya está en manos del Personero.");
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView>
        <View style={styles.headerBuzon}>
          <Ionicons name="chatbox-ellipses" size={50} color="#20bf6b" />
          <Text style={styles.buzonTitle}>Buzón de Ideas</Text>
          <Text style={styles.buzonSub}>Tus propuestas mejoran nuestra institución</Text>
          <TextInput 
            style={styles.inputBuzon} 
            placeholder="¿Qué te gustaría proponer?" 
            value={msg} 
            onChangeText={setMsg} 
            multiline
          />
          <TouchableOpacity onPress={enviar} style={styles.btnEnviarBuzon}>
            <Text style={{color:'#fff', fontWeight:'bold', letterSpacing:1}}>ENVIAR PROPUESTA</Text>
          </TouchableOpacity>
        </View>

        {esAdminBuzon && lista.map((item) => (
          <View key={item.id} style={styles.cardBuzon}>
            <View style={styles.cardBuzonHeader}>
              <Text style={styles.cardBuzonAutor}>{item.autor}</Text>
              <Text style={styles.cardBuzonFecha}>{item.createdAt?.toDate().toLocaleDateString()}</Text>
            </View>
            <Text style={styles.cardBuzonTexto}>{item.texto}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------
// 4. PANTALLA PERFIL (CON CLOUDINARY + CARNET + MODAL)
// ---------------------------------------------------------
function PerfilScreen({ userData }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const carnetColor = userData.cargo === 'Personero' ? '#f1c40f' : (userData.rol === 'Profe' ? '#eb3b5a' : '#4b7bec');

  const pickAndUploadImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setUploading(true);
      try {
        const data = new FormData();
        data.append('file', { uri: result.assets[0].uri, type: 'image/jpeg', name: 'perfil.jpg' });
        data.append('upload_preset', UPLOAD_PRESET);

        const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: data });
        const file = await response.json();
        await updateDoc(doc(db, "usuarios", auth.currentUser.uid), { photoURL: file.secure_url });
        Alert.alert("Éxito", "Foto de perfil actualizada.");
      } catch (error) {
        Alert.alert("Error", "No se pudo subir la imagen.");
      } finally { setUploading(false); }
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.perfilHeader}>
        <TouchableOpacity onPress={pickAndUploadImage} disabled={uploading} style={styles.avatarWrapper}>
          <View style={[styles.bigAvatar, {borderColor: carnetColor}]}>
            {uploading ? (
              <ActivityIndicator color={carnetColor} />
            ) : userData.photoURL ? (
              <Image source={{uri: userData.photoURL}} style={styles.imgAvatar} />
            ) : (
              <Ionicons name="person" size={50} color={carnetColor} />
            )}
            <View style={[styles.camIcon, {backgroundColor: carnetColor}]}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.perfilName}>{userData.nombre}</Text>
        <View style={[styles.badge, {backgroundColor: carnetColor + '15'}]}>
          <Text style={{color: carnetColor, fontWeight:'800', fontSize:12, letterSpacing:1}}>
            {userData.cargo !== "Ninguno" ? userData.cargo.toUpperCase() : userData.rol.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={{padding: 25}}>
        <TouchableOpacity style={styles.btnAction} onPress={() => setModalVisible(true)}>
          <View style={styles.btnActionIcon}><Ionicons name="id-card-outline" size={24} color="#1E293B" /></View>
          <Text style={styles.btnActionText}>Carnet Estudiantil 2026</Text>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btnAction, {marginTop: 15}]} onPress={() => signOut(auth)}>
          <View style={[styles.btnActionIcon, {backgroundColor:'#FEF2F2'}]}><Ionicons name="log-out-outline" size={24} color="#EF4444" /></View>
          <Text style={[styles.btnActionText, {color:'#EF4444'}]}>Desconectar</Text>
        </TouchableOpacity>
      </View>

      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalCenter}>
          <View style={[styles.carnetCard, {borderTopColor: carnetColor, borderTopWidth: 8}]}>
            <View style={[styles.carnetHeader, {backgroundColor: carnetColor}]}>
              <Text style={styles.carnetHeaderText}>IE INELIREFI</Text>
              <Text style={{color:'#fff', fontSize:9, letterSpacing:2}}>VIGENCIA 2026</Text>
            </View>
            <View style={styles.carnetBody}>
               <Image source={userData.photoURL ? {uri: userData.photoURL} : null} style={[styles.carnetImg, {borderColor: carnetColor}]} />
               <Text style={styles.carnetNameText}>{userData.nombre?.toUpperCase()}</Text>
               <Text style={{color: carnetColor, fontWeight:'800', marginBottom: 20}}>{userData.cargo !== "Ninguno" ? userData.cargo : userData.rol}</Text>
               <View style={styles.qrPlaceholder}>
                  <Ionicons name="qr-code-outline" size={100} color="#1E293B" />
               </View>
               <Text style={styles.carnetID}>ID: {auth.currentUser?.uid.substring(0,12)}</Text>
            </View>
            <TouchableOpacity style={styles.btnClose} onPress={() => setModalVisible(false)}>
              <Text style={{color:'#fff', fontWeight:'bold'}}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------
// NAVEGACIÓN Y APP
// ---------------------------------------------------------
const Tab = createBottomTabNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const unsubDoc = onSnapshot(doc(db, "usuarios", u.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
            setUser(u);
          }
          setLoading(false);
        });
        return () => unsubDoc(); 
      } else {
        setUser(null); setUserData(null); setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#4b7bec" /></View>;
  if (!user || !userData) return <AuthScreen />;

  return (
    <Tab.Navigator screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let icon = route.name === 'Cartelera' ? 'grid' : route.name === 'Buzón' ? 'chatbubbles' : 'person';
          return <Ionicons name={icon} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4b7bec',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: { height: 65, paddingBottom: 10, borderTopWidth: 0, elevation: 10, shadowOpacity: 0.1 },
        headerStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0 },
        headerTitleStyle: { fontWeight: '900', color: '#1E293B' }
      })}>
        <Tab.Screen name="Cartelera">{props => <CarteleraScreen {...props} userData={userData} />}</Tab.Screen>
        <Tab.Screen name="Buzón">{props => <BuzonScreen {...props} userData={userData} />}</Tab.Screen>
        <Tab.Screen name="Perfil">{props => <PerfilScreen {...props} userData={userData} />}</Tab.Screen>
      </Tab.Navigator>
  );
}

// ---------------------------------------------------------
// ESTILOS MEJORADOS (NUEVA ESTÉTICA)
// ---------------------------------------------------------
const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor:'#fff' },
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  authContainer: { flex: 1, backgroundColor: '#F1F5F9', justifyContent: 'center', padding: 20 },
  authCard: { backgroundColor: '#fff', borderRadius: 35, padding: 30, elevation: 5 },
  authHeader: { alignItems: 'center', marginBottom: 30 },
  techIcon: { width: 80, height: 80, borderRadius: 25, backgroundColor: '#4b7bec', justifyContent: 'center', alignItems: 'center', marginBottom: 15, transform: [{rotate: '45deg'}] },
  authTitle: { fontSize: 28, fontWeight: '900', color: '#1E293B' },
  authSubtitle: { fontSize: 14, color: '#64748B', marginTop: 5 },
  form: { width: '100%' },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 18, marginBottom: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  modernInput: { flex: 1, height: 55, color: '#1E293B', fontSize: 15, marginLeft: 10 },
  roleWrapper: { marginBottom: 15 },
  roleTabs: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 15, padding: 5, marginBottom: 10 },
  roleTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  activeTab: { backgroundColor: '#fff', elevation: 2 },
  roleTabText: { color: '#64748B', fontWeight: '700' },
  activeRoleText: { color: '#4b7bec' },
  secretInput: { backgroundColor: '#FEF2F2', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#FECACA', color: '#EF4444', textAlign: 'center', fontWeight: 'bold' },
  modernBtn: { backgroundColor: '#1E293B', paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginTop: 10 },
  modernBtnText: { color: '#fff', fontWeight: 'bold', letterSpacing: 1.5 },
  switchLink: { marginTop: 25, alignItems: 'center' },
  switchText: { color: '#64748B' },
  linkBlue: { color: '#4b7bec', fontWeight: '800' },
  headerCartelera: { padding: 20, backgroundColor: '#fff', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 3 },
  labelAdmin: { fontSize: 10, fontWeight: '900', color: '#4b7bec', letterSpacing: 2, marginBottom: 10 },
  inputCartelera: { backgroundColor: '#F1F5F9', padding: 18, borderRadius: 20, minHeight: 90 },
  btnAnuncio: { flexDirection: 'row', alignSelf: 'flex-end', backgroundColor: '#4b7bec', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 15, marginTop: 12 },
  btnAnuncioText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  card: { backgroundColor: '#fff', padding: 20, marginHorizontal: 15, marginTop: 15, borderRadius: 25, elevation: 2 },
  cardPersonero: { borderLeftWidth: 6, borderLeftColor: '#f1c40f' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 38, height: 38, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardAutor: { fontWeight: '800', fontSize: 15, color: '#1E293B' },
  cardRol: { fontSize: 10, color: '#64748B', fontWeight: 'bold', letterSpacing: 1 },
  postTexto: { fontSize: 16, color: '#334155', lineHeight: 24, marginBottom: 15 },
  actionsContainer: { flexDirection: 'row', paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 25 },
  actionText: { marginLeft: 6, color: '#475569', fontWeight: '700' },
  commentSection: { marginTop: 15 },
  commentBubble: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 15, marginTop: 6 },
  commentText: { fontSize: 12, color: '#334155' },
  miniInputContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: '#F1F5F9', borderRadius: 15, paddingHorizontal: 12 },
  miniInput: { flex: 1, height: 45, fontSize: 13 },
  headerBuzon: { padding: 30, alignItems: 'center', backgroundColor: '#fff', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  buzonTitle: { fontSize: 24, fontWeight: '900', color: '#1E293B', marginTop: 10 },
  buzonSub: { color: '#64748B', textAlign: 'center', marginBottom: 20 },
  inputBuzon: { width: '100%', backgroundColor: '#F1F5F9', padding: 20, borderRadius: 25, minHeight: 120 },
  btnEnviarBuzon: { backgroundColor: '#20bf6b', width: '100%', padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 15 },
  cardBuzon: { backgroundColor: '#fff', padding: 20, marginHorizontal: 20, marginTop: 12, borderRadius: 20, borderLeftWidth: 5, borderLeftColor: '#20bf6b' },
  cardBuzonHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardBuzonAutor: { fontWeight: 'bold', color: '#20bf6b' },
  cardBuzonFecha: { fontSize: 10, color: '#94A3B8' },
  cardBuzonTexto: { color: '#334155', lineHeight: 20 },
  perfilHeader: { alignItems: 'center', padding: 40, backgroundColor: '#fff', borderBottomLeftRadius: 50, borderBottomRightRadius: 50, elevation: 5 },
  avatarWrapper: { marginBottom: 15 },
  bigAvatar: { width: 110, height: 110, borderRadius: 40, borderWidth: 4, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  imgAvatar: { width: '100%', height: '100%' },
  camIcon: { position: 'absolute', bottom: -5, right: -5, borderRadius: 12, padding: 8, borderWidth: 3, borderColor: '#fff' },
  perfilName: { fontSize: 26, fontWeight: '900', color: '#1E293B' },
  badge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 15, marginTop: 10 },
  btnAction: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 25, elevation: 2 },
  btnActionIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  btnActionText: { flex: 1, marginLeft: 15, fontWeight: '700', color: '#334155' },
  modalCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.8)' },
  carnetCard: { width: '85%', backgroundColor: '#fff', borderRadius: 35, overflow: 'hidden' },
  carnetHeader: { padding: 20, alignItems: 'center' },
  carnetHeaderText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  carnetBody: { padding: 30, alignItems: 'center' },
  carnetImg: { width: 130, height: 130, borderRadius: 35, borderWidth: 5, marginBottom: 15 },
  carnetNameText: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  qrPlaceholder: { marginTop: 10, padding: 20, backgroundColor: '#F8FAFC', borderRadius: 30 },
  carnetID: { fontSize: 10, color: '#94A3B8', marginTop: 20 },
  btnClose: { backgroundColor: '#1E293B', padding: 20, alignItems: 'center' }
});