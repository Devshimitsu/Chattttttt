import logo from "./logo.svg";
import "./App.css";
import SideBar from "./SideBar";
import ContactBar from "./ContactBar";
import MessageTab from "./MessageTab";
import firebase from "firebase/compat/app";
import { onValue, get, getDatabase, ref, off, update } from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {getStorage,uploadBytes,ref as storageRef} from 'firebase/storage'
import React, {
  createContext,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import SignUp from "./SignUp";
import {
  Route,
  Routes,
  redirect,
  useNavigate,
  useParams,
} from "react-router-dom";
import SignIn from "./SignIn";
import DashBoard from "./Dashboard";
const firebaseConfig = {

  apiKey: "AIzaSyBQ8eN6RxmLMLtVIJUghs0J3eU8jNPQJ38",

  authDomain: "chatapp-87262.firebaseapp.com",

  databaseURL: "https://chatapp-87262-default-rtdb.asia-southeast1.firebasedatabase.app",

  projectId: "chatapp-87262",

  storageBucket: "chatapp-87262.appspot.com",

  messagingSenderId: "520935399994",

  appId: "1:520935399994:web:632481d9fd90b284228b03",

  measurementId: "G-CZYF023TWC"

};

let app = null
if (!firebase.apps.length) {
  app = firebase.initializeApp(firebaseConfig);
}
export const storage = getStorage(app)
export const MessageContext = createContext();

function App() {
  const [messages, setMessages] = useState({});
  const [userInfo, setUserinfo] = useState({});
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState({});
  const [userState, setUserState] = useState({});
  const [profileScreen, setProfileScreen] = useState(false);
  const [names, setNames] = useState([]);
  const [author, setAuthor] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(null);
  const [filteredArr, setFilteredArr] = useState([]);
  const [unreadData, setUnreadData] = useState({});
  const previousState = useRef(messages);
  const firstRender = useRef(true);
  const originalRef = useRef([]);

  useEffect(() => {
    onAuthStateChanged(getAuth(), (user) => {
      setIsSignedIn(user);
    });
  }, []);
  useEffect(() => {
    if (
      Object.keys(messages).length !== 0 &&
      (JSON.stringify(messages.participants) !==
        JSON.stringify(previousState.current.participants) ||
        JSON.stringify(messages.chatName) !==
          JSON.stringify(previousState.current.chatName) ||
        firstRender.current)
    ) {
      firstRender.current = false;
      function participantMap(mapData) {
        Promise.all(
          Object.keys(mapData).map((uid, index) => {
            const nameRef = ref(getDatabase(), "/users/" + uid + "/name");
            return get(nameRef);
          })
        )
          .then((names) => {
            let tempArr = [];
            Promise.all(
              Object.keys(mapData).map((uid, index) => {
                const codeRef = ref(
                  getDatabase(),
                  "/users/" + uid + "/userCode"
                );
                return get(codeRef);
              })
            ).then((codes) => {
              Promise.all(
                Object.keys(mapData).map((uid,index)=>{
                  const pfpRef = ref(getDatabase(),`/users/${uid}/pfpInfo/pfpLink`)
                  return get(pfpRef)
                })
              ).then(pfps=>{
                tempArr = names.map((snapshot, index) => {
                  return {
                    name: snapshot.val(),
                    uid: Object.keys(mapData)[index],
                    pfp: pfps[index].val()
                  };
                });
                const codeArr = codes.map((code, index) => {
                  return {
                    userCode: code.val(),
                  };
                });
                Promise.all(
                  Object.keys(mapData).map((uid, index) => {
                    const aboutRef = ref(
                      getDatabase(),
                      "/users/" + uid + "/about"
                    );
                    return get(aboutRef);
                  })
                ).then((aboutInfo) => {
                  const finalArr = aboutInfo.map((aboutSnapshot, index) => {
                    return {
                      ...tempArr[index],
                      ...codeArr[index],
                      about: aboutSnapshot.val(),
                    };
                  });
                  console.log(finalArr)
                  setNames(finalArr);
                });
              })
              
            });
          })
          .catch((err) => {
          });
      }
      if (messages.participants) {
        if (messages.type == "duo") {
          participantMap(messages.originalParticipants);
        } else {
          participantMap(messages.participants);
        }
      }

      const authorRef = ref(
        getDatabase(),
        "/users/" + messages.author + "/name"
      );
      get(authorRef).then((snapshot) => {
        setAuthor(snapshot.val());
      });
    }
    let unreadListenerInfo = {};
    if (isSignedIn) {
      const unreadRef = ref(getDatabase(), `unreadData/${isSignedIn.uid}`);
      const callback = (unreadChats) => {
        if (unreadChats.exists()) {
          setUnreadData(unreadChats.val());
        } else {
          setUnreadData({});
        }
      };
      const listener = onValue(unreadRef, callback);
      unreadListenerInfo = {
        ref: unreadRef,
        callback: callback,
        listener: listener,
      };
    }
    return () => {
      if (Object.keys(unreadListenerInfo).length !== 0) {
        off(unreadListenerInfo.ref, "value", unreadListenerInfo.callback);
      }
    };
  }, [messages.chatName, messages.participants]);
  useEffect(() => {
    setUserState(
      isSignedIn && names[0] && names[1]
        ? names[0].uid !== isSignedIn.uid
          ? names[0]
          : names[1]
        : ""
    );
  }, [names]);
  return (
    <MessageContext.Provider
      value={{
        messages,
        userInfo,
        setUserinfo,
        showCodeModal,
        setShowCodeModal,
        showRemoveModal,
        setShowRemoveModal,
        names,
        author,
        userState,
        isSignedIn,
        filteredArr,
        setFilteredArr,
        originalRef,
        profileScreen,
        setProfileScreen,
        unreadData,
        setUnreadData,
      }}
    >
      <div className="flex bg-bgColor h-screen w-screen">
        <Routes>
          <Route path="/" element={<SignUp />} />
          <Route path="/auth">
            <Route index element={<SignUp />} />
            <Route path="signin" element={<SignIn />} />
          </Route>
          <Route
            path="/homescreen/:chatId"
            element={
              <ProtectedRoute
                setMessages={setMessages}
                setUserinfo={setUserinfo}
                messages={messages}
                previousState={previousState}
                setFilteredArr={setFilteredArr}
                userInfo={userInfo}
                originalRef={originalRef}
                currentUser={isSignedIn}
              >
                <DashBoard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<h1>Not found</h1>}></Route>
        </Routes>
      </div>
    </MessageContext.Provider>
  );
}
function ProtectedRoute({
  setMessages,
  setUserinfo,
  messages,
  previousState,
  children,
  setFilteredArr,
  userInfo,
  originalRef,
  currentUser,
}) {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const [isSignedIn, setIsSignedIn] = useState(false);
  useEffect(() => {
    const participantRef = ref(getDatabase(), `/chats/${chatId}/participants`);
    const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
      if (chatId !== "none" && Object.keys(messages).length !== 0) {
        get(participantRef).then((snapshot) => {
          const keys = Object.keys(snapshot.val());
          if (Object.keys(messages.participants).includes(user.uid)) {
          } else {
            navigate("/homescreen/none");
          }
        });
      }
    });
    return () => {
      unsubscribe();
    };
  }, [messages.participants]);
  useEffect(() => {
    let listenerInfo = {};
    if (currentUser && chatId !== "none") {
      const unreadRef = ref(
        getDatabase(),
        `/unreadData/${currentUser.uid}/${chatId}`
      );
      const updateRef = ref(getDatabase(), `/unreadData/${currentUser.uid}`);
      const updateUnread = () => {
        update(updateRef, {
          [chatId]: 0,
        });
      };
      const listenerRef = onValue(unreadRef, updateUnread);
      listenerInfo = {
        ref: unreadRef,
        listener: listenerRef,
        callback: updateUnread,
      };
    }
    return () => {
      if (Object.keys(listenerInfo).length !== 0) {
        off(listenerInfo.ref, "value", listenerInfo.callback);
      }
    };
  }, [currentUser, chatId]);
  useEffect(() => {
    const chatsRef = ref(getDatabase(), "/chats/" + chatId);
    let listenerInfo = {};
    const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
      if (!user) {
        navigate("/auth");
      } else {
        const callback = (snapshot) => {
          if (snapshot.exists()) {
            setMessages((prev) => {
              previousState.current = prev;
              return snapshot.val();
            });
          } else {
            setMessages({});
          }
        };
        const listener = onValue(chatsRef, callback);
        listenerInfo = {
          ref: chatsRef,
          callback: callback,
          listener: listener,
        };
      }
    });

    // Cleanup function
    return () => {
      unsubscribe();
      if (Object.keys(listenerInfo).length !== 0) {
        off(listenerInfo.ref, "value", listenerInfo.callback);
      }
    };
  }, [chatId]);

  useEffect(() => {
    let userListenerInfo = {};
    const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
      if (!user) {
        navigate("/auth");
      } else {
        const auth = getAuth();
        const userRef = ref(getDatabase(), `users/${auth.currentUser.uid}`);
        const callback = (snapshot) => {
          setUserinfo(snapshot.val());
        };
        const listener = onValue(userRef, callback);
        userListenerInfo = {
          ref: userRef,
          callback: callback,
          listener: listener,
        };
      }
    });
    return () => {
      unsubscribe();
      if (Object.keys(userListenerInfo).length !== 0) {
        off(userListenerInfo.ref, "value", userListenerInfo.callback);
      }
    };
  }, []);

  useEffect(() => {
    const tempArr = [];

    const listenerRefs = []; // Array to store the listener references
    if (userInfo.chats) {
      Object.keys(userInfo.chats).forEach((value, index) => {
        const chatsRef = ref(getDatabase(), `/chatMetaData/${value}`);
        const callback = (snapshot) => {
          if (snapshot.exists()) {
            const newData = { ...snapshot.val(), chatId: snapshot.key };
            
            const existingChat = tempArr.find(obj => obj.chatId === value);
        
            if (existingChat) {
              // If it exists, update the corresponding object in `tempArr`
              Object.assign(existingChat, newData);
            } else {
              // If it doesn't exist, add the new data to `tempArr`
              tempArr.push(newData);
            }
        
            // Update the reference and sort `tempArr`
            originalRef.current = tempArr;
            tempArr.sort((a, b) => b.lastMsgTime - a.lastMsgTime);
        
            // Update `filteredArr` with sorted `tempArr`
            setFilteredArr([...tempArr]);
          } else {
            setFilteredArr([]);
          }
        };
        
        const listenerRef = onValue(chatsRef, callback);
        listenerRefs.push({
          ref: chatsRef,
          callback: callback,
          unsubscribe: listenerRef,
        }); // Add the listener reference to the array
      });
    } else {
      setFilteredArr([]);
    }

    // Cleanup function to unsubscribe the listeners
    return () => {
      listenerRefs.forEach((listenerRef) => {
        off(listenerRef.ref, "value", listenerRef.callback);
        listenerRef.unsubscribe();
      });
    };
  }, [userInfo]);
  return children;
}
export default App;
