/* engine.js — Risk Scoring & Explanation Engine
 *
 * ออกแบบตามหลัก Explainable AI:
 *   ทุกคะแนนที่ออกมาต้องย้อนกลับไปหา "กฎ" ที่ทำให้เกิดได้เสมอ
 *   ระบบจึงเก็บเหตุผลไว้พร้อมกับคะแนน ไม่ใช่คำนวณเสร็จแล้วค่อยหาคำอธิบายทีหลัง
 *
 * ข้อจำกัดที่ตั้งใจไว้:
 *   - ไม่คำนวณเบี้ยประกัน
 *   - ไม่ตัดสินว่ารับประกันได้หรือไม่
 *   - ข้อที่ผู้ใช้ข้าม จะไม่ถูกเดาค่า แต่จะลด "ความเชื่อมั่น" ของผลแทน
 */

const Engine = (function () {

  function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }

  function bandOf(score) {
    return BANDS.find(b => score <= b.max);
  }

  /* ประเมินหนึ่งด้าน — คืนทั้งคะแนนและเหตุผลที่ทำให้ได้คะแนนนั้น */
  function scoreDomain(key, answers, consent) {
    const d = DOMAINS[key];
    const isHealthDomain = key === 'health';

    // ด้านสุขภาพต้องได้รับความยินยอมข้อมูลอ่อนไหวก่อน มิฉะนั้นไม่ประเมิน
    // คืนค่าว่างทันทีโดยไม่คำนวณอะไรเลย — ไม่ให้เหลือคะแนนหรือเหตุผลค้างไว้ในผลลัพธ์
    // ที่อาจหลุดไปแสดงหรือถูกส่งออกในภายหลัง
    const needsSensitive = isHealthDomain && !consent.sensitive;
    if (needsSensitive) {
      return {
        key: key, name: d.name, short: d.short, icon: d.icon,
        score: null, band: null, bandLabel: 'ไม่ได้ประเมิน', bandCls: 'b-skip',
        prio: null, skipped: true, raised: [], lowered: [], hasCoverage: false
      };
    }

    let score = d.base;
    const raised = [];   // เหตุผลที่ทำให้ความเสี่ยงสูงขึ้น
    const lowered = [];  // เหตุผลที่ทำให้ความเสี่ยงลดลง

    (RULES[key] || []).forEach(rule => {
      if (rule.sensitive && !consent.sensitive) return;   // ข้ามกฎที่ใช้ข้อมูลอ่อนไหว
      let fired = false;
      try { fired = !!rule.when(answers); } catch (e) { fired = false; }
      if (!fired) return;
      score += rule.pts;
      (rule.pts >= 0 ? raised : lowered).push({ why: rule.why, pts: rule.pts, id: rule.id });
    });

    // ปรับด้วยความคุ้มครองที่มีอยู่แล้ว
    const covered = [];
    (OFFSETS[key] || []).forEach(off => {
      if (!has(answers.coverage, off.need)) return;
      score += off.pts;
      covered.push({ why: off.why, pts: off.pts, id: 'cov_' + off.need });
      (off.pts >= 0 ? raised : lowered).push({ why: off.why, pts: off.pts, id: 'cov_' + off.need });
    });

    score = clamp(score);
    const band = bandOf(score);

    return {
      key,
      name: d.name,
      short: d.short,
      icon: d.icon,
      score,
      band: band.key,
      bandLabel: band.label,
      bandCls: band.cls,
      prio: band.prio,
      skipped: needsSensitive,
      // เรียงเหตุผลตามน้ำหนัก เพื่อให้แสดง "ปัจจัยหลัก" ได้ตรงความจริง
      raised: raised.sort((a, b) => b.pts - a.pts),
      lowered: lowered.sort((a, b) => a.pts - b.pts),
      hasCoverage: covered.some(c => c.pts < 0)
    };
  }

  /* ความเชื่อมั่นของผล — ลดลงตามจำนวนข้อที่ผู้ใช้ข้าม
     นับเฉพาะคำถามที่ "ถูกถามจริง" ในรอบนั้น มิฉะนั้นผู้ที่ไม่ยินยอมข้อมูลสุขภาพ
     จะถูกนับว่าข้ามคำถามที่ระบบไม่เคยถามเขา ซึ่งไม่ถูกต้อง */
  function confidenceOf(answers, consent) {
    const asked = QUESTIONS.filter(q => !(q.sensitive && !consent.sensitive));
    const total = asked.length;
    const answered = asked.filter(q => {
      const v = answers[q.id];
      return Array.isArray(v) ? v.length > 0 : (v !== undefined && v !== null && v !== '');
    }).length;
    const pct = Math.round((answered / total) * 100);
    let label = 'สูง';
    if (pct < 60) label = 'ต่ำ';
    else if (pct < 85) label = 'ปานกลาง';
    return { pct, answered, total, label };
  }

  /* สร้างช่องว่างความคุ้มครอง — เฉพาะด้านที่ความเสี่ยงถึงเกณฑ์ และยังไม่มีความคุ้มครองที่ตรงกัน */
  function buildGaps(domains) {
    return domains
      .filter(d => !d.skipped && d.prio && d.score >= 35)
      .sort((a, b) => b.score - a.score)
      .map(d => ({
        key: d.key,
        title: COVERAGE[d.key].title,
        kinds: COVERAGE[d.key].kinds,
        score: d.score,
        prio: d.prio,
        alreadyCovered: d.hasCoverage,
        // เหตุผลสูงสุด 3 ข้อ — ตามแนวทาง XAI ที่ให้แสดงปัจจัยหลักแทนสูตรทั้งหมด
        reasons: d.raised.slice(0, 3).map(r => r.why)
      }));
  }

  /* คำแนะนำเชิงป้องกัน — เรียงตามด้านที่เสี่ยงสูงสุด */
  function buildPrevention(domains) {
    return domains
      .filter(d => !d.skipped && d.score >= 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(d => Object.assign({ key: d.key }, PREVENTION[d.key]));
  }

  /* ข้อจำกัดของผล — ต้องแสดงเสมอ ไม่ใช่ตัวเลือก */
  function buildLimits(domains, conf, consent) {
    const out = [
      'ผลนี้เป็นการประเมินเบื้องต้นจากข้อมูลที่คุณกรอกเท่านั้น ไม่ได้ตรวจสอบกับเอกสารหรือฐานข้อมูลใด',
      'ระบบไม่คำนวณเบี้ยประกัน และไม่ได้พิจารณาว่าบริษัทประกันจะรับประกันคุณหรือไม่',
      'คำแนะนำเป็นประเภทความคุ้มครอง ไม่ใช่ผลิตภัณฑ์ของบริษัทใดบริษัทหนึ่ง และไม่ใช่คำแนะนำการลงทุน'
    ];
    if (conf.pct < 100) {
      out.push('คุณข้าม ' + (conf.total - conf.answered) + ' คำถาม ระบบจึงไม่ได้ประเมินปัจจัยส่วนนั้น และไม่ได้เดาค่าแทนคุณ');
    }
    if (!consent.sensitive) {
      out.push('คุณไม่ได้ให้ความยินยอมข้อมูลสุขภาพ ระบบจึงไม่ประเมินความเสี่ยงด้านสุขภาพเลย');
    }
    out.push('การตัดสินใจขั้นสุดท้ายควรผ่านการตรวจสอบของผู้เชี่ยวชาญที่ได้รับใบอนุญาต');
    return out;
  }

  /* ─── จุดเข้าใช้งานหลัก ─── */
  function assess(answers, consent) {
    const domains = Object.keys(DOMAINS).map(k => scoreDomain(k, answers, consent));
    const scored = domains.filter(d => !d.skipped);

    // คะแนนรวม = ถ่วงน้ำหนักให้ด้านที่เสี่ยงสูงสุดมีอิทธิพลมากกว่าค่าเฉลี่ยธรรมดา
    // เพราะความเสี่ยงหนึ่งด้านที่สูงมากส่งผลจริงมากกว่าความเสี่ยงปานกลางหลายด้าน
    let overall = 0;
    if (scored.length) {
      const sorted = scored.map(d => d.score).sort((a, b) => b - a);
      const avg = sorted.reduce((s, n) => s + n, 0) / sorted.length;
      overall = clamp(avg * 0.6 + sorted[0] * 0.4);
    }

    const band = bandOf(overall);
    const conf = confidenceOf(answers, consent);

    const OVERALL_DESC = {
      low:  'ความเสี่ยงโดยรวมอยู่ในระดับที่จัดการได้ ควรรักษาระดับนี้ไว้และทบทวนปีละครั้ง',
      mid:  'มีบางด้านที่ควรเสริมความคุ้มครอง ดูรายละเอียดรายด้านด้านล่าง',
      high: 'มีช่องว่างความคุ้มครองที่ควรจัดการก่อน โดยเฉพาะด้านที่ขึ้นสถานะสูง'
    };

    return {
      overall,
      overallBand: band.key,
      overallLabel: 'ความเสี่ยงโดยรวม: ' + band.label,
      overallDesc: OVERALL_DESC[band.key],
      confidence: conf,
      domains,
      gaps: buildGaps(domains),
      prevention: buildPrevention(domains),
      limits: buildLimits(domains, conf, consent),
      engineVersion: '0.9.0-prototype'
    };
  }

  /* สรุปสำหรับส่งให้ผู้เชี่ยวชาญ — ตั้งใจให้อ่านได้ด้วยตาเปล่า
     เพื่อให้ผู้ใช้ตรวจสอบก่อนว่าจะยอมให้ส่งข้อมูลชุดนี้หรือไม่ */
  function buildReviewSummary(result, consent) {
    const L = [];
    L.push('── สรุปเพื่อการตรวจสอบโดยผู้เชี่ยวชาญ ──');
    L.push('เวอร์ชันเครื่องมือ : ' + result.engineVersion);
    L.push('ความเสี่ยงโดยรวม  : ' + result.overall + '/100 (' + result.overallLabel.replace('ความเสี่ยงโดยรวม: ', '') + ')');
    L.push('ความครบของข้อมูล  : ' + result.confidence.answered + '/' + result.confidence.total + ' ข้อ (' + result.confidence.label + ')');
    L.push('');
    L.push('ความเสี่ยงรายด้าน');
    result.domains.forEach(d => {
      L.push(d.skipped
        ? '  • ' + d.name + ' : ไม่ได้ประเมิน (ไม่ได้รับความยินยอมข้อมูลสุขภาพ)'
        : '  • ' + d.name + ' : ' + d.score + '/100 (' + d.bandLabel + ')');
    });
    if (result.gaps.length) {
      L.push('');
      L.push('ช่องว่างที่ระบบเสนอให้ตรวจสอบ');
      result.gaps.forEach((g, i) => {
        L.push('  ' + (i + 1) + '. ' + g.title + ' [' + g.prio.label + ']');
        g.reasons.forEach(r => L.push('     - ' + r));
      });
    }
    L.push('');
    L.push('ข้อมูลที่ไม่ถูกส่ง : คำตอบรายข้อ, ตัวเลขรายได้, รายละเอียดสุขภาพรายรายการ');
    L.push('ความยินยอมส่งตรวจสอบ : ' + (consent.review ? 'ให้ไว้แล้ว' : 'ยังไม่ได้ให้'));
    L.push('');
    L.push('หมายเหตุ: ระบบไม่ได้อนุมัติหรือปฏิเสธการรับประกัน และไม่ได้คำนวณเบี้ย');
    return L.join('\n');
  }

  return { assess: assess, buildReviewSummary: buildReviewSummary, bandOf: bandOf };
})();
