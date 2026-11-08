package online.getfurqan.app;

import android.content.ComponentName;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import java.util.concurrent.atomic.AtomicBoolean;
import androidx.core.content.ContextCompat;
import androidx.media3.common.*;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.session.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.common.util.concurrent.ListenableFuture;
import java.io.File;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.json.JSONObject;

@UnstableApi
@CapacitorPlugin(name="FurqanAudio")
public final class FurqanAudioPlugin extends Plugin {
    private ListenableFuture<MediaController> future;
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final AtomicInteger generation=new AtomicInteger();
    private boolean loading=false;
    private final Player.Listener events=new Player.Listener(){@Override public void onEvents(Player player,Player.Events events){notifyListeners("state",snapshot(player));}};
    private interface Action {void run(MediaController controller) throws Exception;}
    private void controller(PluginCall call,Action action){
        if(getActivity()==null){call.reject("Audio player unavailable");return;}
        getActivity().runOnUiThread(()->{
            if(future==null)future=new MediaController.Builder(getContext(),new SessionToken(getContext(),new ComponentName(getContext(),RecitationService.class))).buildAsync();
            final ListenableFuture<MediaController> request=future;
            AtomicBoolean completed=new AtomicBoolean(false);Handler main=new Handler(Looper.getMainLooper());
            Runnable timeout=()->{if(completed.compareAndSet(false,true)){loading=false;generation.incrementAndGet();if(future==request){MediaController.releaseFuture(request);future=null;}call.reject("Audio player unavailable");}};
            main.postDelayed(timeout,20000);
            request.addListener(()->{if(!completed.compareAndSet(false,true))return;main.removeCallbacks(timeout);try{MediaController c=request.get();c.removeListener(events);c.addListener(events);action.run(c);}catch(Exception e){loading=false;call.reject("Audio player unavailable");}},ContextCompat.getMainExecutor(getContext()));
        });
    }
    private JSObject snapshot(Player c){
        JSObject s=new JSObject();MediaItem item=c.getCurrentMediaItem();Bundle extra=item==null?null:item.mediaMetadata.extras;
        s.put("key",extra==null?"":extra.getString("packKey",""));s.put("title",extra==null?"":extra.getString("surahTitle",""));s.put("artist",item==null?"":String.valueOf(item.mediaMetadata.artist));
        s.put("index",Math.max(0,c.getCurrentMediaItemIndex()));s.put("count",c.getMediaItemCount());s.put("ref",item==null?"":item.mediaId);s.put("playing",c.isPlaying());s.put("loading",loading||c.getPlaybackState()==Player.STATE_BUFFERING);
        s.put("position",Math.max(0,c.getCurrentPosition())/1000.0);s.put("duration",c.getDuration()>0?c.getDuration()/1000.0:0);s.put("error",c.getPlayerError()!=null);return s;
    }
    @PluginMethod public void getState(PluginCall call){controller(call,c->call.resolve(snapshot(c)));}
    @PluginMethod public void loadQueue(PluginCall call){
        final int token=generation.incrementAndGet();loading=true;
        final String key=call.getString("key",""),title=call.getString("title",""),artist=call.getString("artist",""),root=call.getString("root","");
        final JSArray rows=call.getArray("tracks");final int start=call.getInt("index",0);
        controller(call,c->{
            c.pause();
            worker.execute(()->{
                try{
                    if(rows==null||rows.length()>286||title.length()>120||artist.length()>120)throw new Exception();
                    List<RecitationFiles.Track> tracks=new ArrayList<>();
                    for(int i=0;i<rows.length();i++){JSONObject r=rows.getJSONObject(i);tracks.add(new RecitationFiles.Track(r.getString("path"),r.getString("ref"),r.getString("sha256"),r.getLong("bytes")));}
                    List<File> files=RecitationFiles.validate(new File(getContext().getFilesDir(),"recitations-v1"),root,key,tracks);
                    if(start<0||start>=files.size())throw new Exception();
                    List<MediaItem> items=new ArrayList<>();
                    for(int i=0;i<files.size();i++){Bundle extras=new Bundle();extras.putString("packKey",key);extras.putString("surahTitle",title);
                        MediaMetadata meta=new MediaMetadata.Builder().setTitle(title+" · "+tracks.get(i).ref).setArtist(artist).setExtras(extras).build();
                        items.add(new MediaItem.Builder().setMediaId(tracks.get(i).ref).setUri(Uri.fromFile(files.get(i))).setMimeType(MimeTypes.AUDIO_MPEG).setMediaMetadata(meta).build());}
                    getActivity().runOnUiThread(()->{if(token!=generation.get()){call.reject("Audio request cancelled");return;}loading=false;c.setMediaItems(items,start,0);c.prepare();c.play();call.resolve(snapshot(c));});
                }catch(Exception e){if(getActivity()!=null)getActivity().runOnUiThread(()->{if(token==generation.get())loading=false;call.reject("Downloaded audio could not be checked. Try downloading this surah again.");});}
            });
        });
    }
    @PluginMethod public void play(PluginCall call){controller(call,c->{if(loading||c.getMediaItemCount()==0)throw new Exception();if(c.getPlaybackState()==Player.STATE_ENDED)c.seekTo(c.getCurrentMediaItemIndex(),0);c.prepare();c.play();call.resolve(snapshot(c));});}
    @PluginMethod public void pause(PluginCall call){generation.incrementAndGet();loading=false;controller(call,c->{c.pause();call.resolve(snapshot(c));});}
    @PluginMethod public void stop(PluginCall call){generation.incrementAndGet();loading=false;controller(call,c->{c.stop();c.clearMediaItems();call.resolve(snapshot(c));});}
    @PluginMethod public void seekVerse(PluginCall call){controller(call,c->{int index=call.getInt("index",-1);if(index<0||index>=c.getMediaItemCount())throw new Exception();c.seekTo(index,0);call.resolve(snapshot(c));});}
    @Override protected void handleOnDestroy(){generation.incrementAndGet();worker.shutdownNow();if(future!=null){if(future.isDone())try{future.get().removeListener(events);}catch(Exception ignored){}MediaController.releaseFuture(future);future=null;}super.handleOnDestroy();}
}
