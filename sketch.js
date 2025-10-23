// =================================================================
// 步驟一：分數數據接收與全域變數
// -----------------------------------------------------------------

let finalScore = 0; 
let maxScore = 0;
let scoreText = ""; 

// 針對煙火效果新增的變數
let fireworks = []; // 儲存所有的煙火物件
let isFullScore = false; // 滿分旗標


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
        
        // H5P 分數更新時，如果 canvas 停止了，則重新啟動 draw() 迴圈
        if (typeof loop === 'function') {
            loop(); 
        }
    }
}, false);


// =================================================================
// 步驟二：煙火粒子類別 (Particle Class)
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
            this.vel.mult(0.92); // 空氣阻力
            this.lifespan -= 4; // 衰減
        }
        
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.acc.mult(0); 
    }
    
    done() {
        return this.lifespan < 0;
    }
    
    show() {
        // HSB 模式
        if (!this.firework) {
            // 爆炸粒子
            strokeWeight(3);
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
// 步驟三：煙火主類別 (Firework Class)
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
// 步驟四：p5.js setup 和 draw 邏輯
// -----------------------------------------------------------------

function setup() { 
    // 設定 Canvas 大小
    createCanvas(windowWidth / 2, windowHeight / 2); 
    // 啟用 HSB 模式 (Hue, Saturation, Brightness)，方便顏色控制
    colorMode(HSB); 
    // 初始背景為白色 (當 draw() 執行時會被覆蓋)
    background(255); 
    // 預設讓 draw() 持續運行
} 


function draw() { 
    
    // 計算百分比
    let percentage = (maxScore > 0) ? (finalScore / maxScore) * 100 : 0;
    
    // =================================================================
    // A. 背景和動畫控制
    // -----------------------------------------------------------------
    
    if (isFullScore) {
        // 滿分時：使用透明的黑色背景，製造殘影效果
        background(0, 0, 0, 25); 
    } else {
        // 非滿分時：使用不透明的白色背景（與原代碼風格一致）
        background(255); 
    }

    
    // =================================================================
    // B. 煙火特效處理 (滿分時產生和顯示)
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

    
    // =================================================================
    // C. 文本和幾何圖形繪製 (放在煙火特效之上)
    // -----------------------------------------------------------------
    
    textSize(80); 
    textAlign(CENTER);
    
    // 1. 頂部鼓勵文本
    if (percentage >= 90) {
        fill(120, 255, 200); // 綠色 (HSB)
        text("恭喜！優異成績！", width / 2, height / 2 - 50);
        
    } else if (percentage >= 60) {
        fill(45, 255, 255); // 黃色 (HSB)
        text("成績良好，請再接再厲。", width / 2, height / 2 - 50);
        
    } else if (percentage > 0) {
        fill(0, 200, 255); // 紅色 (HSB)
        text("需要加強努力！", width / 2, height / 2 - 50);
        
    } else {
        fill(0, 0, 150); // 灰色 (HSB)
        text("等待成績...", width / 2, height / 2); 
    }

    // 2. 顯示具體分數
    textSize(50);
    // 滿分煙火時背景為黑，文字用白色 (HSB: 0, 0, 255)
    // 非滿分時背景為白，文字用深色 (HSB: 0, 0, 50)
    if (isFullScore) {
        fill(0, 0, 255); 
    } else {
        fill(0, 0, 50); 
    }
    
    text(`得分: ${finalScore}/${maxScore}`, width / 2, height / 2 + 50);
    
    
    // 3. 幾何圖形
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
