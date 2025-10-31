// รอให้หน้าเว็บโหลดเสร็จ
document.addEventListener("DOMContentLoaded", () => {
  
  // --- 1. ตรวจสอบสิทธิ์ (สำคัญมาก!) ---
  auth.onAuthStateChanged(user => {
    if (user) {
      // 1.1 เช็ก Role จาก Firestore
      checkUserRole(user.uid);
    } else {
      // 1.2 ไม่ได้ล็อกอิน
      console.log("User not logged in. Redirecting...");
      window.location.href = "login.html";
    }
  });

  async function checkUserRole(uid) {
    try {
      const userDoc = await db.collection("users").doc(uid).get();
      
      // ⭐️ (สำคัญ!) ตรวจสอบว่า Role คือ "owner" หรือไม่
      if (userDoc.exists && userDoc.data().role === "owner") {
        console.log("Owner access granted.");
        // 1.3 ถ้าใช่ ให้เริ่มดึงข้อมูล
        fetchDashboardData();
      } else {
        // 1.4 ถ้าไม่ใช่ "owner" ให้เตะออก
        console.error("Access denied. User is not an owner.");
        alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
        window.location.href = "pos.html"; // เด้งไปหน้า POS แทน
      }
    } catch (err) {
      console.error("Error checking user role:", err);
      window.location.href = "login.html";
    }
  }

  // --- 2. ฟังก์ชันหลักในการดึงข้อมูล ---
  async function fetchDashboardData() {
    // 2.1 กำหนดช่วงเวลา
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    
    // (คำนวณวันแรกของสัปดาห์ (สมมติเริ่มวันอาทิตย์))
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // 2.2 Query ข้อมูล (ดึงออเดอร์ทั้งเดือน)
    try {
      const querySnapshot = await db.collection("orders")
        .where("timestamp", ">=", startOfMonth) // ⭐️ เอาเฉพาะเดือนนี้
        .get();

      // 2.3 สร้างตัวแปรนับ
      let dailySales = 0;
      let weeklySales = 0;
      let monthlySales = 0;
      const weeklyItemCount = {}; // ⭐️ { "ข้าวหน้าเป็ด": { qty: 5, img: "..." } }

      // 2.4 วนลูปประมวลผล
      querySnapshot.forEach(doc => {
        const order = doc.data();
        const orderTime = order.timestamp.toDate(); // ⭐️ แปลงเวลา
        
        // --- ก. คำนวณยอดขาย ---
        monthlySales += order.totalPrice; // ทุกออเดอร์ในเดือนนี้

        if (orderTime >= startOfWeek) {
          weeklySales += order.totalPrice; // ออเดอร์ในสัปดาห์นี้
          
          // --- ข. นับสินค้าขายดี (เฉพาะในสัปดาห์นี้) ---
          order.items.forEach(item => {
            // (ตัดคำว่า (ธรรมดา) (พิเศษ) ออก)
            const baseName = item.name.split(' (')[0].trim();
            
            // ถ้ายังไม่มีชื่อนี้ใน object ให้สร้าง
            if (!weeklyItemCount[baseName]) {
              weeklyItemCount[baseName] = {
                qty: 0,
                imageUrl: item.imageUrl || '',
                price: item.price
              };
            }
            // เพิ่มจำนวน
            weeklyItemCount[baseName].qty += item.qty;
          });
        }

        if (orderTime >= startOfToday) {
          dailySales += order.totalPrice; // ออเดอร์ในวันนี้
        }
      });

      // 2.5 อัปเดตยอดขาย (หน้าเว็บ)
      updateSalesUI(dailySales, weeklySales, monthlySales);

      // 2.6 อัปเดตสินค้าขายดี (หน้าเว็บ)
      updateTopItemsUI(weeklyItemCount);

    } catch (err) {
      console.error("Error fetching dashboard data: ", err);
    }
  }

  // --- 3. ฟังก์ชันอัปเดต UI (ยอดขาย) ---
  function updateSalesUI(daily, weekly, monthly) {
    const formatter = new Intl.NumberFormat('th-TH'); // ⭐️ (ตัวเลือก) ทำให้มีจุลภาค
    
    document.getElementById("sales-daily").textContent = `฿ ${formatter.format(daily)}`;
    document.getElementById("sales-weekly").textContent = `฿ ${formatter.format(weekly)}`;
    document.getElementById("sales-monthly").textContent = `฿ ${formatter.format(monthly)}`;
  }

  // --- 4. ฟังก์ชันอัปเดต UI (สินค้าขายดี) ---
  function updateTopItemsUI(itemCount) {
    const listContainer = document.getElementById("top-items-list");
    listContainer.innerHTML = ""; // ล้างของเก่า

    // 4.1 แปลง Object เป็น Array
    // (จะได้หน้าตาแบบ: [ ["ข้าวหน้าเป็ด", {qty: 5, ...}], ["กะเพรา", {qty: 2, ...}] ])
    const itemsArray = Object.entries(itemCount);

    // 4.2 เรียงลำดับ (Sort) จากมากไปน้อย
    itemsArray.sort((a, b) => b[1].qty - a[1].qty);

    // 4.3 เอาแค่ 5 อันดับแรก
    const top5Items = itemsArray.slice(0, 5);

    // 4.4 วนลูปสร้าง HTML
    top5Items.forEach((item, index) => {
      const itemName = item[0];
      const itemData = item[1];
      
      const card = document.createElement('li');
      card.className = "top-item-card";
      
      card.innerHTML = `
        <img src="${itemData.imageUrl || ''}" alt="${itemName}">
        <div class="top-item-details">
          <h4>${itemName}</h4>
        </div>
        <span class="top-item-rank">${index + 1}</span>
      `;
      listContainer.appendChild(card);
    });
  }

}); // <-- ปิด DOMContentLoaded