(function(root){
  'use strict';
  function num(v){var n=Number(v);return Number.isFinite(n)?n:NaN;}
  function calculate(input){
    input=input||{};
    var capacity=num(input.capacityKwh),soc=num(input.soc),consumption=num(input.consumption),distance=num(input.distanceKm),reserve=input.reserveSoc==null?15:num(input.reserveSoc),factor=input.factor==null?1:num(input.factor);
    if(!(capacity>=1&&capacity<=300))throw new Error('ظرفیت باتری باید بین ۱ تا ۳۰۰ کیلووات‌ساعت باشد.');
    if(!(soc>=0&&soc<=100))throw new Error('درصد شارژ باید بین ۰ تا ۱۰۰ باشد.');
    if(!(consumption>=1&&consumption<=100))throw new Error('مصرف باید بین ۱ تا ۱۰۰ کیلووات‌ساعت در ۱۰۰ کیلومتر باشد.');
    if(!(distance>=0&&distance<=100000))throw new Error('مسافت مسیر معتبر نیست.');
    if(!(reserve>=0&&reserve<=50))throw new Error('ذخیره امن باید بین ۰ تا ۵۰ درصد باشد.');
    if(!(factor>=0.7&&factor<=2.5))throw new Error('ضریب شرایط مسیر معتبر نیست.');
    var effective=consumption*factor;
    var usableKwh=capacity*soc/100;
    var energyKwh=distance*effective/100;
    var arrivalSoc=soc-(energyKwh/capacity*100);
    var safeRangeKm=(capacity*Math.max(0,soc-reserve)/100)/effective*100;
    var totalRangeKm=usableKwh/effective*100;
    var marginKwh=capacity*(arrivalSoc-reserve)/100;
    return {
      capacityKwh:capacity,startSoc:soc,reserveSoc:reserve,consumption:consumption,
      factor:factor,effectiveConsumption:effective,distanceKm:distance,
      usableEnergyKwh:usableKwh,energyKwh:energyKwh,arrivalSoc:arrivalSoc,
      totalRangeKm:totalRangeKm,safeRangeKm:safeRangeKm,marginKwh:marginKwh,
      reachable:arrivalSoc>=reserve,deficitKwh:Math.max(0,-marginKwh),
      requiredSocPct:energyKwh/capacity*100+reserve
    };
  }
  root.REVEnergy={calculate:calculate,version:'1.0.0'};
})(typeof window!=='undefined'?window:globalThis);
