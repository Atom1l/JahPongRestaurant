// เราจะรอให้หน้าเว็บ HTML โหลดเสร็จก่อน ค่อยเริ่มทำงาน
document.addEventListener("DOMContentLoaded", () => {
  
  // 1. ดึงองค์ประกอบ HTML มาเก็บในตัวแปร
  const loginForm = document.getElementById("login-form");
  const loginEmail = document.getElementById("login-email");
  const loginPassword = document.getElementById("login-password");
  const loginError = document.getElementById("login-error");

  // ตรวจสอบว่าเรามีตัวแปร auth ที่สร้างไว้ใน login.html
  if (typeof auth === 'undefined') {
    console.error('Firebase Auth (auth) is not defined. Check your script order in login.html');
    return;
  }

  // 2. เพิ่ม "ตัวดักฟัง" ไปที่ฟอร์ม
  // เราจะดักฟังเหตุการณ์ "submit" (ซึ่งเกิดจากการกดปุ่ม หรือ Enter)
  loginForm.addEventListener("submit", (event) => {
    
    // 3. ป้องกันไม่ให้หน้าเว็บโหลดใหม่ (สำคัญมาก!)
    event.preventDefault();

    // 4. ดึงค่า (value) ที่ผู้ใช้พิมพ์ออกมา
    const email = loginEmail.value;
    const password = loginPassword.value;

    // ล้างข้อความ error เก่าออก
    loginError.textContent = "";

    // 5. เรียกใช้คำสั่ง Login ของ Firebase!
    auth.signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        // 6. ล็อกอินสำเร็จ!
        const user = userCredential.user;
        console.log("ล็อกอินสำเร็จ! User:", user.uid);
        
        if (userCredential.user.email === 'kitchen@gmail.com') {
            // ถ้าเป็น user ครัว
            window.location.href = 'kds.html'; // ไปหน้า KDS
        } else {
            // ถ้าเป็น user อื่น (เช่น หน้าร้าน)
            window.location.href = 'pos.html'; // ไปหน้า POS
        }

      })
      .catch((error) => {
        // 7. ล็อกอินไม่สำเร็จ!
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



