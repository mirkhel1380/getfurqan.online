import Foundation
import CryptoKit
let base=FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString),library=base.appendingPathComponent("Library"),root=library.appendingPathComponent("NoCloud/recitations-v1"),key="7-1",token="11111111-1111-4111-8111-111111111111"
try FileManager.default.createDirectory(at:root.appendingPathComponent(key),withIntermediateDirectories:true)
defer{try? FileManager.default.removeItem(at:base)}
var tracks=[[String:Any]]()
for verse in 1...7{var bytes=Data(repeating:0,count:120);bytes[0]=73;bytes[1]=68;bytes[2]=51;bytes[20]=UInt8(verse);let relative="recitations-v1/\(key)/\(token)-\(verse).mp3",file=root.appendingPathComponent("\(key)/\(token)-\(verse).mp3");try bytes.write(to:file);tracks.append(["path":relative,"ref":"1:\(verse)","bytes":120,"sha256":SHA256.hash(data:bytes).map{String(format:"%02x",$0)}.joined()])}
func check(_ rows:[[String:Any]],rootURI:String?=nil,key:String="7-1",index:Int=0)throws->VerifiedRecitation{try RecitationFiles.validate(library:library,rootURI:rootURI ?? root.absoluteString,key:key,title:"Al-Fatihah",artist:"Source reciter",tracks:rows,index:index)}
func reject(_ rows:[[String:Any]],rootURI:String?=nil,key:String="7-1",index:Int=0){do{_ = try check(rows,rootURI:rootURI,key:key,index:index);fatalError("Unsafe queue accepted")}catch{}}
let verified=try check(tracks);assert(verified.files.count==7);assert(RecitationFiles.counts.reduce(0,+)==6236)
reject(Array(tracks.dropLast()));reject(tracks,rootURI:"https://example.invalid");reject(tracks,key:"7-01");reject(tracks,index:7)
var wrong=tracks;wrong[0]["path"]="../../private";reject(wrong);wrong=tracks;wrong[0]["ref"]="1:2";reject(wrong)
try Data(repeating:1,count:120).write(to:root.appendingPathComponent("\(key)/\(token)-1.mp3"));reject(tracks)
print("PASS: iOS complete queue, canonical local paths, source reference order, digest verification, bounds and all 6236 metadata counts.")
