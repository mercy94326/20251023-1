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
        
        // 確保 draw() 迴圈啟動
        if (typeof loop === 'function') {
            loop(); 
        }
    }
}, false);


// =================================================================
// 步驟二：煙火粒子類別 (Particle Class) - 優化視覺效果
// -----------------------------------------------------------------

class Particle {
    constructor(x, y, hue, firework) {
        this.pos = createVector(x, y);
        this.firework = firework; 
        this.lifespan = 255;
        this.hue = hue;
        
        if (this.firework) {
            // 火箭向上發射，速度適中
            this.vel = createVector(0, random(-9, -6)); 
            this.acc = createVector(0, 0);
        } else {
            // 爆炸粒子，隨機方向
            this.vel = p5.Vector.random2D();
            this.vel.mult(random(1, 4)); // 爆炸初速度變慢
            this.acc = createVector(0, 0); 
        }
    }

    applyForce(force) {
        this.acc.add(force);
    }
    
    update() {
        if (!this.firework) {
            this.applyForce(createVector(0, 0.15)); // 重力減少
            this.vel.mult(0.95); // 緩慢減速
            this.lifespan -= 2; // 衰減變慢，粒子停留更久
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
            // 爆炸粒子：使用 fill 和 ellipse 創造光暈
            noStroke();
            // 讓顏色隨著壽命衰減，但保持亮度
            fill(this.hue, 255, 255, this.lifespan * 0.8); 
            ellipse(this.pos.x, this.pos.y, 4, 4); 
        } else {
            // 火箭：用 point 畫出拖尾
            strokeWeight(5); 
            stroke(this.hue, 255, 255);
            point(this.pos.x, this.pos.y);
        }
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
        this.explosionHeight = random(height * 0.3, height * 0.6); // 在畫面中間爆炸
    }
    
    update() {
        if (!this.exploded) {
            this.firework.update();
            // 爆炸條件：到達預定高度
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
        // 滿分時粒子數量
        let numParticles = 150; 
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
// 步驟四：p5.js setup 和 draw 邏輯 - 實現重疊和特效
// -----------------------------------------------------------------

function setup() { 
    // 保持畫布大小為視窗一半，但實現重疊
    let canvas = createCanvas(windowWidth / 2, windowHeight / 2); 
    
    // !!! 關鍵：CSS 設置實現重疊和穿透 !!!
    // 假設 H5P 內容也是置中的，這樣設置才能對齊
    canvas.position(windowWidth / 2 - width / 2, windowHeight / 2 - height / 2); 
    canvas.style('z-index', '9999'); // 設置高 z-index 確保在最上層
    canvas.style('pointer-events', 'none'); // 允許點擊穿透 Canvas
    
    colorMode(HSB); 
    // 預設讓 draw() 持續運行
} 

// 確保視窗大小變化時 Canvas 仍然置中
function windowResized() {
    resizeCanvas(windowWidth / 2, windowHeight / 2);
    // 重設 Canvas 位置
    select('canvas').position(windowWidth / 2 - width / 2, windowHeight / 2 - height / 2);
}


function draw() { 
    
    // 計算百分比
    let percentage = (maxScore > 0) ? (finalScore / maxScore) * 100 : 0;
    
    // =================================================================
    // A. 背景和動畫控制 (實現延遲顯示和殘影)
    // -----------------------------------------------------------------
    
    if (isFullScore) {
        // 滿分時：使用透明的黑色背景，製造光影殘留效果
        background(0, 0, 0, 15); // 透明度 15
    } else {
        // 非滿分時：完全清除 Canvas，顯示下方的 H5P 內容
        clear(); 
    }

    
    // =================================================================
    // B. 煙火特效處理 (新增發光效果)
    // -----------------------------------------------------------------
    
    if (isFullScore) {
        // 使用加法混色，使煙火粒子發光
        blendMode(ADD);
    
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
        if (random(1) < 0.1) { // 10% 的機率生成新煙火
            fireworks.push(new Firework());
        }
    } 

    // 恢復普通混色模式，確保文本和幾何圖形能正常顯示
    blendMode(BLEND); 

    
    // =================================================================
    // C. 文本和幾何圖形繪製
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
