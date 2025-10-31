// เราจะรอให้หน้าเว็บ HTML โหลดเสร็จก่อน ค่อยเริ่มทำงาน
document.addEventListener("DOMContentLoaded", () => {
  
  // 1. ดึงองค์ประกอบ HTML มาเก็บในตัวแปร
  const loginForm = document.getElementById("login-form");
  const loginEmail = document.getElementById("login-email");
  const loginPassword = document.getElementById("login-password");
  const loginError = document.getElementById("login-error");

  // ⭐️ (แก้ไข) ตรวจสอบว่าเรามีตัวแปร auth และ db ที่สร้างไว้ใน login.html
  if (typeof auth === 'undefined' || typeof db === 'undefined') {
    console.error('Firebase (auth or db) is not defined. Check your script order in login.html');
    return;
  }

  // 2. เพิ่ม "ตัวดักฟัง" ไปที่ฟอร์ม
  loginForm.addEventListener("submit", (event) => {
    
    // 3. ป้องกันไม่ให้หน้าเว็บโหลดใหม่ (สำคัญมาก!)
    event.preventDefault();

    // 4. ดึงค่า (value) ที่ผู้ใช้พิมพ์ออกมา
    const email = loginEmail.value;
    const password = loginPassword.value;

    // ล้างข้อความ error เก่าออก
    loginError.textContent = "";

    let userId = null; // ⭐️ (ใหม่!) ตัวแปรไว้เก็บ UID

    // 5. เรียกใช้คำสั่ง Login ของ Firebase!
    auth.signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        // 6. ล็อกอินสำเร็จ! (ขั้นที่ 1: ได้ UID)
        const user = userCredential.user;
        userId = user.uid; // ⭐️ เก็บ UID ไว้
        console.log("ล็อกอินสำเร็จ! User:", userId);
        
        // 7. ⭐️ (ใหม่!) ไปค้นหา "Role" ของ User นี้ใน Firestore ⭐️
        return db.collection("users").doc(userId).get();
      })
      .then((doc) => {
        // 8. ⭐️ (ใหม่!) ได้ข้อมูล Role (ขั้นที่ 2)
        if (doc.exists) {
          // 8.1 ถ้าเจอบันทึก
          const role = doc.data().role;
          console.log("User role is:", role);

          // 9. ⭐️ (ใหม่!) แยกไปหน้าต่างๆ ตาม Role ⭐️
          if (role === 'owner') {
            window.location.href = 'dashboard.html'; // 👈 (เพิ่ม!) ไปหน้า Dashboard
          } else if (role === 'kitchen') {
            window.location.href = 'kds.html';       // 👈 (เหมือนเดิม) ไปหน้า KDS
          } else if (role === 'staff') {
            window.location.href = 'pos.html';       // 👈 (เหมือนเดิม) ไปหน้า POS
          } else {
            // (กรณีมี Role แปลกๆ)
            console.error("Unknown role:", role);
            alert("ไม่รู้จัก Role ของคุณ, ไปที่หน้า POS ตามค่าเริ่มต้น");
            window.location.href = 'pos.html';
          }

        } else {
          // 8.2 ถ้าไม่เจอ (เช่น ล็อกอินได้ แต่ไม่มีข้อมูลในตู้ users)
          console.error("ไม่พบข้อมูลผู้ใช้ (role) ใน Firestore!");
          loginError.textContent = "ไม่พบข้อมูลผู้ใช้ในระบบ";
          auth.signOut(); // สั่ง Logout ออก
        }
      })
      .catch((error) => {
        // 10. ล็อกอินไม่สำเร็จ! (จับ Error ทั้งจาก Auth และ Firestore)
        console.error("ล็อกอินล้มเหลว:", error.code, error.message);

        // แสดงข้อความ error ให้ผู้ใช้เห็น
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          loginError.textContent = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
        } else {
          loginError.textContent = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
        }
      });
  });

});