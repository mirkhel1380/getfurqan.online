package online.getfurqan.app;

import android.app.PendingIntent;
import android.content.Intent;
import android.os.Process;
import androidx.annotation.Nullable;
import androidx.media3.common.*;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.*;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;

@UnstableApi
public final class RecitationService extends MediaSessionService {
    private MediaSession session;
    @Override public void onCreate() {
        super.onCreate();
        ExoPlayer player=new ExoPlayer.Builder(this).build();
        player.setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_SPEECH).build(),true);
        player.setHandleAudioBecomingNoisy(true);
        player.setWakeMode(C.WAKE_MODE_LOCAL);
        player.addListener(new Player.Listener(){@Override public void onPlayerError(PlaybackException error){player.pause();}});
        Intent launch=new Intent(this,MainActivity.class).setAction(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        PendingIntent pending=PendingIntent.getActivity(this,0,launch,PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
        session=new MediaSession.Builder(this,player).setSessionActivity(pending).setCallback(new MediaSession.Callback(){
            @Override public ListenableFuture<MediaSession.ConnectionResult> onConnectAsync(MediaSession mediaSession,MediaSession.ControllerInfo controller){
                if(controller.getUid()!=Process.myUid()&&!controller.isTrusted())return Futures.immediateFuture(MediaSession.ConnectionResult.reject());
                Player.Commands commands=MediaSession.ConnectionResult.DEFAULT_PLAYER_COMMANDS;
                if(controller.getUid()!=Process.myUid())commands=commands.buildUpon().remove(Player.COMMAND_CHANGE_MEDIA_ITEMS).remove(Player.COMMAND_SET_MEDIA_ITEM).build();
                return Futures.immediateFuture(new MediaSession.ConnectionResult.AcceptedResultBuilder(mediaSession,controller).setAvailablePlayerCommands(commands).build());
            }
        }).build();
    }
    @Override @Nullable public MediaSession onGetSession(MediaSession.ControllerInfo controller){return session;}
    @Override public void onTaskRemoved(@Nullable Intent intent){pauseAllPlayersAndStopSelf();}
    @Override public void onDestroy(){if(session!=null){session.getPlayer().release();session.release();session=null;}super.onDestroy();}
}
