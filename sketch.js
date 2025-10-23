// =================================================================
// 步驟一：模擬成績數據接收
// -----------------------------------------------------------------


// 確保這是全域變數
let finalScore = 0; 
let maxScore = 0;
let scoreText = ""; // 用於 p5.js 繪圖的文字

// 針對煙火效果新增的變數
let fireworks = []; // 儲存所有的煙火物件
let isFullScore = false; // 新增旗標，用於 draw() 迴圈判斷


window.addEventListener('message', function (event) {
    // 執行來源驗證...
    // ...
    const data = event.data;
    
    if (data && data.type === 'H5P_SCORE_RESULT') {
        
        // !!! 關鍵步驟：更新全域變數 !!!
        finalScore = data.score; // 更新全域變數
        maxScore = data.maxScore;
        scoreText = `最終成績分數: ${finalScore}/${maxScore}`;
        
        // 更新滿分旗標
        isFullScore = (maxScore > 0) && (finalScore === maxScore);
        
        console.log("新的分數已接收:", scoreText, "是否滿分:", isFullScore); 
        
        // ----------------------------------------
        // 關鍵步驟 2: 呼叫重新繪製 (啟用 loop 以便動畫開始/持續)
        // ----------------------------------------
        if (typeof loop === 'function') {
            loop(); // 確保 p5.js 進入連續繪製模式
        }
    }
}, false);


// =================================================================
// 步驟三：煙火粒子類別 (Particle Class)
// -----------------------------------------------------------------

class Particle {
    constructor(x, y, hue, firework) {
        this.pos = createVector(x, y);
        this.firework = firework; 
        this.lifespan = 255;
        this.hue = hue;
        
        if (this.firework) {
            // 火箭向上發射，給予一個初始垂直速度
            this.vel = createVector(0, random(-14, -10)); 
            this.acc = createVector(0, 0);
        } else {
            // 爆炸粒子，隨機方向
            this.vel = p5.Vector.random2D();
            this.vel.mult(random(2, 8)); // 爆炸初速度
            this.acc = createVector(0, 0); 
        }
        
    }

    applyForce(force) {
        this.acc.add(force);
    }
    
    update() {
        if (!this.firework) {
            this.applyForce(createVector(0, 0.25)); // 重力
            this.vel.mult(0.92); // 空氣阻力，讓粒子慢下來
            this.lifespan -= 4; // 衰減
        }
        
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.acc.mult(0); // 重置加速度
    }
    
    done() {
        return this.lifespan < 0;
    }
    
    show() {
        // HSB 模式已在 setup() 中設定
        if (!this.firework) {
            // 爆炸粒子
            strokeWeight(3);
            // 讓爆炸粒子有漂亮的拖尾效果
            stroke(this.hue, 255, 255, this.lifespan); 
        } else {
            // 火箭
            strokeWeight(4);
            stroke(this.hue, 255, 255);
        }
        point(this.pos.x, this.pos.y);
    }
}


// =================================================================
// 步驟四：煙火主類別 (Firework Class)
// -----------------------------------------------------------------

class Firework {
    constructor() {
        this.hue = random(255);
        // 火箭從畫布底部隨機水平位置發射
        this.firework = new Particle(random(width / 5, width * 4 / 5), height, this.hue, true); 
        this.exploded = false;
        this.particles = [];
        this.explosionHeight = random(height * 0.2, height * 0.5); // 隨機爆炸高度
    }
    
    update() {
        if (!this.exploded) {
            this.firework.update();
            // 爆炸條件：到達預定高度（y 越小代表越高）
            if (this.firework.pos.y <= this.explosionHeight) {
                this.exploded = true;
                this.explode();
            }
        }
        
        // 更新和移除已消失的粒子
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].done()) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    explode() {
        // 滿分時粒子數量增加
        let numParticles = 120; 
        for (let i = 0; i < numParticles; i++) {
            let p = new Particle(this.firework.pos.x, this.firework.pos.y, this.hue, false);
            this.particles.push(p);
        }
    }
    
    show() {
        if (!this.exploded) {
            this.firework.show();
        }
        
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].show();
        }
    }
    
    done() {
        // 當火箭爆炸且所有粒子都消失時，煙火結束
        return this.exploded && this.particles.length === 0;
    }
}


// =================================================================
// 步驟二：使用 p5.js 繪製分數 (在網頁 Canvas 上顯示)
// -----------------------------------------------------------------

function setup() { 
    createCanvas(windowWidth / 2, windowHeight / 2); 
    colorMode(HSB); // 設定顏色模式為 HSB，方便煙火顏色控制
    background(0); 
    // 不使用 noLoop()，讓 draw() 保持運行，由 if/else 邏輯控制煙火生成
} 

// score_display.js 中的 draw() 函數片段

function draw() { 
    // 更改 background() 為帶透明度的黑色，創造煙火殘影效果
    // 僅在有煙火時才使用透明背景，否則使用純黑 (0, 0, 0, 255)
    if (fireworks.length > 0 || isFullScore) {
        background(0, 0, 0, 25); 
    } else {
        background(255); // 非滿分、無煙火時，使用白色背景（與原代碼一致）
    }

    // 計算百分比
    let percentage = (maxScore > 0) ? (finalScore / maxScore) * 100 : 0;
    
    
    // -----------------------------------------------------------------
    // C. 煙火特效處理 (滿分時產生和顯示)
    // -----------------------------------------------------------------
    
    // 處理和顯示煙火
    for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        fireworks[i].show();
        
        // 移除已完成的煙火
        if (fireworks[i].done()) {
            fireworks.splice(i, 1);
        }
    }
    
    // 滿分時，持續生成新的煙火
    if (isFullScore) {
        if (random(1) < 0.1) { // 約 10% 的機率生成新煙火
            fireworks.push(new Firework());
        }
    }
    
    // -----------------------------------------------------------------
    // A. 根據分數區間改變文本顏色和內容 (畫面反映一) (放在煙火之上)
    // -----------------------------------------------------------------
    textSize(80); 
    textAlign(CENTER);
    
    if (percentage >= 90) {
        // 滿分或高分：顯示鼓勵文本，使用鮮豔顏色
        fill(120, 255, 200); // 綠色 (HSB)
        text("恭喜！優異成績！", width / 2, height / 2 - 50);
        
    } else if (percentage >= 60) {
        // 中等分數：顯示一般文本，使用黃色 (HSB)
        fill(45, 255, 255); 
        text("成績良好，請再接再厲。", width / 2, height / 2 - 50);
        
    } else if (percentage > 0) {
        // 低分：顯示警示文本，使用紅色 (HSB)
        fill(0, 200, 255); 
        text("需要加強努力！", width / 2, height / 2 - 50);
        
    } else {
        // 尚未收到分數或分數為 0
        fill(0, 0, 150); // 灰色 (HSB)
        text("等待成績...", width / 2, height / 2); // 更改為等待文本
    }

    // 顯示具體分數
    textSize(50);
    // 根據背景顏色調整文本顏色，滿分煙火為黑色背景，用白色字
    if (isFullScore) {
        fill(0, 0, 255); 
    } else {
        fill(50); // 原來的深灰色字
    }
    
    text(`得分: ${finalScore}/${maxScore}`, width / 2, height / 2 + 50);
    
    
    // -----------------------------------------------------------------
    // B. 根據分數觸發不同的幾何圖形反映 (畫面反映二)
    // -----------------------------------------------------------------
    
    noStroke();
    if (percentage >= 90) {
        // 畫一個大圓圈代表完美 
        fill(120, 255, 200, 0.5); // 綠色帶透明度 (HSB)
        circle(width / 2, height / 2 + 150, 150);
        
    } else if (percentage >= 60) {
        // 畫一個方形 
        fill(45, 255, 255, 0.5); // 黃色帶透明度 (HSB)
        rectMode(CENTER);
        rect(width / 2, height / 2 + 150, 150, 150);
    }
}
