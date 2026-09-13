export const WEAPONS = {
 ak: { name: 'AK-47', type: 'ASSAULT RIFLE', damage: 29, rate: .115, magazine: 30, reload: 2.35, spread: .016, color: '#9a7347' },
 m4: { name: 'M4A1', type: 'ASSAULT RIFLE', damage: 24, rate: .085, magazine: 30, reload: 1.9, spread: .009, color: '#748173' },
 mp5: { name: 'MP5', type: 'SUBMACHINE GUN', damage: 19, rate: .065, magazine: 35, reload: 1.6, spread: .022, color: '#727b85' },
 awp: { name: 'AWP', type: 'SNIPER RIFLE', damage: 85, rate: 1.15, magazine: 5, reload: 2.9, spread: .003, color: '#647547' },
}
export const SKINS = [
 { id:'standard',name:'Factory',rarity:'STANDARD',price:0,color:'#72796c',accent:'#33382e' },
 { id:'desert',name:'Desert Camo',rarity:'UNCOMMON',price:300,color:'#beaa79',accent:'#695d38' },
 { id:'arctic',name:'Arctic Ice',rarity:'RARE',price:550,color:'#b6d7dc',accent:'#4b849c' },
 { id:'toxic',name:'Toxic Pulse',rarity:'EPIC',price:800,color:'#b0ee52',accent:'#344d1f' },
 { id:'crimson',name:'Crimson Web',rarity:'EPIC',price:1100,color:'#cf5252',accent:'#4e1e24' },
 { id:'gold',name:'Gold Rush',rarity:'LEGENDARY',price:1600,color:'#e6ba58',accent:'#876128' },
]
const box=(x,z,w,d,h,color,kind='concrete')=>({x,z,w,d,h,color,kind})
const perimeter=[box(-25,0,1,46,6,'#8b8876'),box(25,0,1,46,6,'#8b8876'),box(0,-23,51,1,6,'#8b8876'),box(0,23,51,1,6,'#8b8876')]
export const MAPS = {
 dust: {name:'Dust Yard',subtitle:'Sanoat hududi',sky:'#bac6c1',ground:'#a1997d',fog:'#b2b8a4',boxes:[...perimeter,box(-12,-8,5,12,3.2,'#696f52','container'),box(12,8,5,12,3.2,'#8b674c','container'),box(10,-11,7,4,2.8,'#666e64','container'),box(-10,11,7,4,2.8,'#767966','container'),box(0,0,7,4,2.6,'#9b947e'),box(-19,4,3,4,1.4,'#8d7956','crate'),box(19,-4,3,4,1.4,'#8d7956','crate'),box(0,-14,2,2,1.2,'#8a7855','crate'),box(0,14,2,2,1.2,'#8a7855','crate'),box(-7,1,2,3,1.1,'#9c967e'),box(7,-1,2,3,1.1,'#9c967e')] },
 depot: {name:'Iron Depot',subtitle:'Konteyner terminali',sky:'#9bafbd',ground:'#717976',fog:'#99aab1',boxes:[...perimeter,box(-12,-10,4,10,3.4,'#3f7474','container'),box(12,10,4,10,3.4,'#3f7474','container'),box(12,-10,4,10,3.4,'#91533b','container'),box(-12,10,4,10,3.4,'#91533b','container'),box(0,0,4,10,3.4,'#9a874f','container'),box(-20,0,4,4,1.3,'#9b8e6a','crate'),box(20,0,4,4,1.3,'#9b8e6a','crate'),box(0,-16,5,2,1.2,'#83897b'),box(0,16,5,2,1.2,'#83897b')] },
}
export const DEFAULT_PROFILE={name:'Operator',coins:1000,weapon:'ak',skin:'standard',owned:['standard'],matches:0,wins:0,kills:0,deaths:0,history:[],sensitivity:1,volume:.45,quality:'high'}
export function readProfile(){try{const p=JSON.parse(localStorage.getItem('strikezone-profile')||'{}');return {...DEFAULT_PROFILE,...p,weapon:WEAPONS[p.weapon]?p.weapon:'ak',skin:SKINS.some(s=>s.id===p.skin)?p.skin:'standard',owned:Array.isArray(p.owned)?p.owned:['standard'],history:Array.isArray(p.history)?p.history:[]}}catch{return {...DEFAULT_PROFILE}}}
export const CONTROLS=[['W A S D','Yurish'],['Sichqoncha','Qarash / nishon'],['Chap tugma','Otish'],['O‘ng tugma','Aniq nishon (ADS)'],['SHIFT','Yugurish'],['SPACE','Sakrash'],['C / CTRL','O‘tirish'],['R','Qayta o‘qlash'],['1 – 4','Qurol almashtirish'],['TAB','Jang natijalari'],['ESC','Tanaffus / kursor']]
