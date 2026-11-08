import Foundation
import Capacitor
import AVFoundation
import MediaPlayer
import UIKit

final class FurqanAudioEngine {
    static let shared=FurqanAudioEngine()
    var changed: (() -> Void)?
    private let player=AVQueuePlayer()
    private var queue: VerifiedRecitation?
    private var index=0
    private var itemIndices=[ObjectIdentifier:Int]()
    private var observations=[NSKeyValueObservation]()
    private var notifications=[NSObjectProtocol]()
    private var timer: Any?
    private var rebuilding=false
    private(set) var generation=0
    private(set) var loading=false
    private var failed=false
    private init(){
        observations.append(player.observe(\.currentItem,options:[.new]){[weak self] _,_ in
            guard let self,self.rebuilding == false else{return}
            if let current=self.player.currentItem,let next=self.itemIndices[ObjectIdentifier(current)]{self.index=next}
            self.update()
        })
        observations.append(player.observe(\.timeControlStatus,options:[.new]){[weak self] _,_ in self?.update()})
        timer=player.addPeriodicTimeObserver(forInterval:CMTime(seconds:1,preferredTimescale:600),queue:.main){[weak self] _ in self?.update()}
        let center=NotificationCenter.default
        notifications.append(center.addObserver(forName:AVAudioSession.interruptionNotification,object:nil,queue:.main){[weak self] n in
            if (n.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt) == AVAudioSession.InterruptionType.began.rawValue {self?.pause()}
        })
        notifications.append(center.addObserver(forName:AVAudioSession.routeChangeNotification,object:nil,queue:.main){[weak self] n in
            if (n.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt) == AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue {self?.pause()}
        })
        notifications.append(center.addObserver(forName:.AVPlayerItemFailedToPlayToEndTime,object:nil,queue:.main){[weak self] n in
            guard let self,let item=n.object as? AVPlayerItem,self.itemIndices[ObjectIdentifier(item)] != nil else{return};self.failed=true;self.pause()
        })
        let remote=MPRemoteCommandCenter.shared()
        remote.playCommand.addTarget{[weak self] _ in self?.remote{try $0.play()} ?? .commandFailed}
        remote.pauseCommand.addTarget{[weak self] _ in self?.remote{$0.pause()} ?? .commandFailed}
        remote.togglePlayPauseCommand.addTarget{[weak self] _ in self?.remote{e in if e.player.timeControlStatus != .paused{e.pause()}else{try e.play()}} ?? .commandFailed}
        remote.nextTrackCommand.addTarget{[weak self] _ in self?.remote{if !$0.move(1){throw NSError(domain:"AlFurqanAudio",code:7)}} ?? .commandFailed}
        remote.previousTrackCommand.addTarget{[weak self] _ in self?.remote{if !$0.move(-1){throw NSError(domain:"AlFurqanAudio",code:7)}} ?? .commandFailed}
        remote.stopCommand.addTarget{[weak self] _ in self?.remote{$0.stop()} ?? .commandFailed}
        UIApplication.shared.beginReceivingRemoteControlEvents();update()
    }
    private func remote(_ action: @escaping (FurqanAudioEngine) throws -> Void) -> MPRemoteCommandHandlerStatus {
        let run={()->MPRemoteCommandHandlerStatus in do{try action(self);return .success}catch{return .commandFailed}}
        return Thread.isMainThread ? run():DispatchQueue.main.sync(execute:run)
    }
    private func seconds(_ time: CMTime)->Double{let value=CMTimeGetSeconds(time);return value.isFinite && value>=0 ? value:0}
    var state:[String:Any]{
        let count=queue?.files.count ?? 0
        return ["key":queue?.key ?? "","title":queue?.title ?? "","artist":queue?.artist ?? "","index":index,"count":count,"ref":count>index ? queue!.refs[index]:"","playing":player.timeControlStatus == .playing,"loading":loading || player.timeControlStatus == .waitingToPlayAtSpecifiedRate,"position":seconds(player.currentTime()),"duration":seconds(player.currentItem?.duration ?? .zero),"error":failed || player.error != nil]
    }
    func beginLoad()->Int{generation+=1;loading=true;player.pause();update();return generation}
    func failLoad(_ token:Int){if generation==token{loading=false;failed=true;update()}}
    func setQueue(_ data:VerifiedRecitation,token:Int)throws{
        guard generation==token else{throw NSError(domain:"AlFurqanAudio",code:4)}
        queue=data;index=data.index;loading=false;failed=false;rebuild(at:index);try play()
    }
    private func rebuild(at target:Int){
        guard let queue else{return};rebuilding=true;player.pause();player.removeAllItems();itemIndices.removeAll();index=target
        for n in target..<queue.files.count{let item=AVPlayerItem(url:queue.files[n]);itemIndices[ObjectIdentifier(item)]=n;player.insert(item,after:nil)}
        rebuilding=false;update()
    }
    func play()throws{
        guard !loading,let queue else{throw NSError(domain:"AlFurqanAudio",code:5)}
        if player.currentItem == nil{rebuild(at:min(index,queue.files.count-1))}
        let session=AVAudioSession.sharedInstance();try session.setCategory(.playback,mode:.spokenAudio);try session.setActive(true)
        failed=false;player.play();update()
    }
    func pause(){generation+=1;loading=false;player.pause();try? AVAudioSession.sharedInstance().setActive(false,options:.notifyOthersOnDeactivation);update()}
    func stop(){pause();rebuilding=true;player.removeAllItems();queue=nil;index=0;itemIndices.removeAll();failed=false;rebuilding=false;update()}
    @discardableResult func move(_ offset:Int)->Bool{seek(index+offset)}
    @discardableResult func seek(_ target:Int)->Bool{
        guard !loading,let queue,target>=0,target<queue.files.count else{return false}
        let running=player.timeControlStatus != .paused;rebuild(at:target);if running{try? play()};return true
    }
    private func update(){
        let remote=MPRemoteCommandCenter.shared(),count=queue?.files.count ?? 0
        remote.playCommand.isEnabled=count>0;remote.pauseCommand.isEnabled=count>0;remote.togglePlayPauseCommand.isEnabled=count>0;remote.stopCommand.isEnabled=count>0
        remote.previousTrackCommand.isEnabled=index>0;remote.nextTrackCommand.isEnabled=index+1<count
        if let queue,count>0{
            MPNowPlayingInfoCenter.default().nowPlayingInfo=[MPMediaItemPropertyTitle:queue.title+" · "+queue.refs[index],MPMediaItemPropertyArtist:queue.artist,MPNowPlayingInfoPropertyElapsedPlaybackTime:seconds(player.currentTime()),MPMediaItemPropertyPlaybackDuration:seconds(player.currentItem?.duration ?? .zero),MPNowPlayingInfoPropertyPlaybackRate:player.rate]
        }else{MPNowPlayingInfoCenter.default().nowPlayingInfo=nil}
        changed?()
    }
}
@objc(FurqanAudioPlugin)
public class FurqanAudioPlugin:CAPPlugin,CAPBridgedPlugin{
    public let identifier="FurqanAudioPlugin"
    public let jsName="FurqanAudio"
    public let pluginMethods:[CAPPluginMethod]=["getState","loadQueue","play","pause","stop","seekVerse"].map{CAPPluginMethod(name:$0,returnType:CAPPluginReturnPromise)}
    private var engine:FurqanAudioEngine{FurqanAudioEngine.shared}
    public override func load(){DispatchQueue.main.async{[weak self] in self?.engine.changed={[weak self] in guard let self else{return};self.notifyListeners("state",data:self.engine.state)}}}
    private func act(_ call:CAPPluginCall,_ operation:@escaping(FurqanAudioEngine)throws->Void){DispatchQueue.main.async{[weak self] in guard let self else{return};do{try operation(self.engine);call.resolve(self.engine.state)}catch{call.reject("Audio player unavailable")}}}
    @objc func getState(_ call:CAPPluginCall){act(call){_ in}}
    @objc func play(_ call:CAPPluginCall){act(call){try $0.play()}}
    @objc func pause(_ call:CAPPluginCall){act(call){$0.pause()}}
    @objc func stop(_ call:CAPPluginCall){act(call){$0.stop()}}
    @objc func seekVerse(_ call:CAPPluginCall){let target=call.getInt("index") ?? -1;act(call){if !$0.seek(target){throw NSError(domain:"AlFurqanAudio",code:6)}}}
    @objc func loadQueue(_ call:CAPPluginCall){
        let root=call.getString("root") ?? "",key=call.getString("key") ?? "",title=call.getString("title") ?? "",artist=call.getString("artist") ?? "",tracks:[[String:Any]]=(call.getArray("tracks",JSObject.self) ?? []).map{$0.mapValues{$0 as Any}},index=call.getInt("index") ?? 0
        DispatchQueue.main.async{[weak self] in guard let self else{return};let token=self.engine.beginLoad()
            DispatchQueue.global(qos:.userInitiated).async{
                do{
                    let library=try FileManager.default.url(for:.libraryDirectory,in:.userDomainMask,appropriateFor:nil,create:false)
                    let data=try RecitationFiles.validate(library:library,rootURI:root,key:key,title:title,artist:artist,tracks:tracks,index:index)
                    DispatchQueue.main.async{do{try self.engine.setQueue(data,token:token);call.resolve(self.engine.state)}catch{call.reject("Audio request cancelled")}}
                }catch{DispatchQueue.main.async{self.engine.failLoad(token);call.reject("Downloaded audio could not be checked. Try downloading this surah again.")}}
            }
        }
    }
}
