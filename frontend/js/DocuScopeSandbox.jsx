import ReactDOM from 'react-dom'
import React from 'react'

import {
  ReflexContainer,
  ReflexSplitter,
  ReflexElement
} from 'react-reflex'

import 'react-reflex/styles.css'
import '../css/testing.css';

/////////////////////////////////////////////////////////
// Basic vertical re-flex layout with splitter
// Adding a splitter between two ReflexElements
// will allow the user to resize them
// 
// https://github.com/leefsmp/Re-Flex
// https://leefsmp.github.io/Re-Flex/index.html
//
/////////////////////////////////////////////////////////
export default class DocuScopeSandbox extends React.Component {

  render () {

    return (
      <div className="pane-container">
        <div>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Enim sit amet venenatis urna. Dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Aenean sed adipiscing diam donec adipiscing tristique risus nec. Nulla facilisi nullam vehicula ipsum a. Nunc mi ipsum faucibus vitae aliquet nec ullamcorper sit amet. Vulputate ut pharetra sit amet aliquam id diam. Nulla facilisi nullam vehicula ipsum a arcu cursus. Porttitor eget dolor morbi non arcu risus quis. Lectus magna fringilla urna porttitor rhoncus dolor. Neque viverra justo nec ultrices dui. Suscipit tellus mauris a diam maecenas sed enim ut sem. Ut tellus elementum sagittis vitae et leo. Mauris pellentesque pulvinar pellentesque habitant morbi tristique senectus et. Non quam lacus suspendisse faucibus. Imperdiet proin fermentum leo vel orci. Nisl rhoncus mattis rhoncus urna neque viverra. Orci a scelerisque purus semper eget duis at tellus at.
        </div>
        <div className="pane-main">
          <ReflexContainer orientation="vertical">

            <ReflexElement className="left-pane">
              <div className="pane-content">
    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Enim sit amet venenatis urna. Dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Aenean sed adipiscing diam donec adipiscing tristique risus nec. Nulla facilisi nullam vehicula ipsum a. Nunc mi ipsum faucibus vitae aliquet nec ullamcorper sit amet. Vulputate ut pharetra sit amet aliquam id diam. Nulla facilisi nullam vehicula ipsum a arcu cursus. Porttitor eget dolor morbi non arcu risus quis. Lectus magna fringilla urna porttitor rhoncus dolor. Neque viverra justo nec ultrices dui. Suscipit tellus mauris a diam maecenas sed enim ut sem. Ut tellus elementum sagittis vitae et leo. Mauris pellentesque pulvinar pellentesque habitant morbi tristique senectus et. Non quam lacus suspendisse faucibus. Imperdiet proin fermentum leo vel orci. Nisl rhoncus mattis rhoncus urna neque viverra. Orci a scelerisque purus semper eget duis at tellus at.

    Ac tincidunt vitae semper quis lectus nulla at volutpat diam. Penatibus et magnis dis parturient montes. Sapien nec sagittis aliquam malesuada. Eu nisl nunc mi ipsum faucibus vitae aliquet nec. Pellentesque sit amet porttitor eget dolor morbi. Amet tellus cras adipiscing enim eu. Ornare massa eget egestas purus viverra accumsan. Senectus et netus et malesuada fames ac. In egestas erat imperdiet sed euismod. Lacus luctus accumsan tortor posuere. Auctor augue mauris augue neque. Integer eget aliquet nibh praesent tristique magna sit amet purus. Est sit amet facilisis magna. Tincidunt tortor aliquam nulla facilisi. Non pulvinar neque laoreet suspendisse interdum. Neque laoreet suspendisse interdum consectetur.

    Nunc non blandit massa enim nec. Ornare suspendisse sed nisi lacus sed viverra. In egestas erat imperdiet sed euismod nisi. Est velit egestas dui id ornare. Amet consectetur adipiscing elit duis tristique sollicitudin. Tristique sollicitudin nibh sit amet commodo nulla facilisi nullam vehicula. Convallis aenean et tortor at risus. Egestas dui id ornare arcu. Quis ipsum suspendisse ultrices gravida. Eleifend mi in nulla posuere. Sit amet tellus cras adipiscing enim eu. Mauris augue neque gravida in fermentum et sollicitudin ac orci. Lorem ipsum dolor sit amet consectetur adipiscing elit.

    Consequat id porta nibh venenatis cras sed. Quis viverra nibh cras pulvinar mattis nunc sed blandit. Arcu cursus euismod quis viverra nibh cras pulvinar mattis nunc. Adipiscing tristique risus nec feugiat in fermentum. Ultrices tincidunt arcu non sodales neque sodales ut etiam sit. Varius duis at consectetur lorem. Euismod quis viverra nibh cras pulvinar mattis nunc sed. Purus sit amet luctus venenatis. Sed velit dignissim sodales ut eu sem integer vitae justo. Massa tincidunt nunc pulvinar sapien et ligula ullamcorper malesuada proin. Praesent semper feugiat nibh sed. Erat imperdiet sed euismod nisi porta lorem. Semper feugiat nibh sed pulvinar proin.

    Eget felis eget nunc lobortis mattis. Imperdiet massa tincidunt nunc pulvinar sapien et ligula ullamcorper malesuada. Sed ullamcorper morbi tincidunt ornare massa eget egestas purus. Ullamcorper sit amet risus nullam. Risus nullam eget felis eget nunc lobortis mattis aliquam. Imperdiet massa tincidunt nunc pulvinar sapien et ligula ullamcorper malesuada. Eget velit aliquet sagittis id consectetur purus. Eu mi bibendum neque egestas congue quisque. Sagittis orci a scelerisque purus semper eget duis at tellus. Id neque aliquam vestibulum morbi blandit. Risus ultricies tristique nulla aliquet enim tortor at auctor urna. In tellus integer feugiat scelerisque varius. Mauris sit amet massa vitae tortor. Non pulvinar neque laoreet suspendisse interdum consectetur libero. Diam sit amet nisl suscipit adipiscing bibendum est ultricies. Ut tristique et egestas quis. Sagittis eu volutpat odio facilisis mauris sit. Ultricies mi eget mauris pharetra et ultrices.
              </div>
            </ReflexElement>

            <ReflexSplitter propagate={true}/>

            <ReflexElement className="middle-pane"
              minSize="200"
              maxSize="800">
              <div className="pane-content">
    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Enim sit amet venenatis urna. Dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Aenean sed adipiscing diam donec adipiscing tristique risus nec. Nulla facilisi nullam vehicula ipsum a. Nunc mi ipsum faucibus vitae aliquet nec ullamcorper sit amet. Vulputate ut pharetra sit amet aliquam id diam. Nulla facilisi nullam vehicula ipsum a arcu cursus. Porttitor eget dolor morbi non arcu risus quis. Lectus magna fringilla urna porttitor rhoncus dolor. Neque viverra justo nec ultrices dui. Suscipit tellus mauris a diam maecenas sed enim ut sem. Ut tellus elementum sagittis vitae et leo. Mauris pellentesque pulvinar pellentesque habitant morbi tristique senectus et. Non quam lacus suspendisse faucibus. Imperdiet proin fermentum leo vel orci. Nisl rhoncus mattis rhoncus urna neque viverra. Orci a scelerisque purus semper eget duis at tellus at.

    Ac tincidunt vitae semper quis lectus nulla at volutpat diam. Penatibus et magnis dis parturient montes. Sapien nec sagittis aliquam malesuada. Eu nisl nunc mi ipsum faucibus vitae aliquet nec. Pellentesque sit amet porttitor eget dolor morbi. Amet tellus cras adipiscing enim eu. Ornare massa eget egestas purus viverra accumsan. Senectus et netus et malesuada fames ac. In egestas erat imperdiet sed euismod. Lacus luctus accumsan tortor posuere. Auctor augue mauris augue neque. Integer eget aliquet nibh praesent tristique magna sit amet purus. Est sit amet facilisis magna. Tincidunt tortor aliquam nulla facilisi. Non pulvinar neque laoreet suspendisse interdum. Neque laoreet suspendisse interdum consectetur.

    Nunc non blandit massa enim nec. Ornare suspendisse sed nisi lacus sed viverra. In egestas erat imperdiet sed euismod nisi. Est velit egestas dui id ornare. Amet consectetur adipiscing elit duis tristique sollicitudin. Tristique sollicitudin nibh sit amet commodo nulla facilisi nullam vehicula. Convallis aenean et tortor at risus. Egestas dui id ornare arcu. Quis ipsum suspendisse ultrices gravida. Eleifend mi in nulla posuere. Sit amet tellus cras adipiscing enim eu. Mauris augue neque gravida in fermentum et sollicitudin ac orci. Lorem ipsum dolor sit amet consectetur adipiscing elit.

    Consequat id porta nibh venenatis cras sed. Quis viverra nibh cras pulvinar mattis nunc sed blandit. Arcu cursus euismod quis viverra nibh cras pulvinar mattis nunc. Adipiscing tristique risus nec feugiat in fermentum. Ultrices tincidunt arcu non sodales neque sodales ut etiam sit. Varius duis at consectetur lorem. Euismod quis viverra nibh cras pulvinar mattis nunc sed. Purus sit amet luctus venenatis. Sed velit dignissim sodales ut eu sem integer vitae justo. Massa tincidunt nunc pulvinar sapien et ligula ullamcorper malesuada proin. Praesent semper feugiat nibh sed. Erat imperdiet sed euismod nisi porta lorem. Semper feugiat nibh sed pulvinar proin.

    Eget felis eget nunc lobortis mattis. Imperdiet massa tincidunt nunc pulvinar sapien et ligula ullamcorper malesuada. Sed ullamcorper morbi tincidunt ornare massa eget egestas purus. Ullamcorper sit amet risus nullam. Risus nullam eget felis eget nunc lobortis mattis aliquam. Imperdiet massa tincidunt nunc pulvinar sapien et ligula ullamcorper malesuada. Eget velit aliquet sagittis id consectetur purus. Eu mi bibendum neque egestas congue quisque. Sagittis orci a scelerisque purus semper eget duis at tellus. Id neque aliquam vestibulum morbi blandit. Risus ultricies tristique nulla aliquet enim tortor at auctor urna. In tellus integer feugiat scelerisque varius. Mauris sit amet massa vitae tortor. Non pulvinar neque laoreet suspendisse interdum consectetur libero. Diam sit amet nisl suscipit adipiscing bibendum est ultricies. Ut tristique et egestas quis. Sagittis eu volutpat odio facilisis mauris sit. Ultricies mi eget mauris pharetra et ultrices.
              </div>
            </ReflexElement>

            <ReflexSplitter propagate={true}/>

            <ReflexElement className="right-pane">
              <div className="pane-content">
    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Enim sit amet venenatis urna. Dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Aenean sed adipiscing diam donec adipiscing tristique risus nec. Nulla facilisi nullam vehicula ipsum a. Nunc mi ipsum faucibus vitae aliquet nec ullamcorper sit amet. Vulputate ut pharetra sit amet aliquam id diam. Nulla facilisi nullam vehicula ipsum a arcu cursus. Porttitor eget dolor morbi non arcu risus quis. Lectus magna fringilla urna porttitor rhoncus dolor. Neque viverra justo nec ultrices dui. Suscipit tellus mauris a diam maecenas sed enim ut sem. Ut tellus elementum sagittis vitae et leo. Mauris pellentesque pulvinar pellentesque habitant morbi tristique senectus et. Non quam lacus suspendisse faucibus. Imperdiet proin fermentum leo vel orci. Nisl rhoncus mattis rhoncus urna neque viverra. Orci a scelerisque purus semper eget duis at tellus at.

    Ac tincidunt vitae semper quis lectus nulla at volutpat diam. Penatibus et magnis dis parturient montes. Sapien nec sagittis aliquam malesuada. Eu nisl nunc mi ipsum faucibus vitae aliquet nec. Pellentesque sit amet porttitor eget dolor morbi. Amet tellus cras adipiscing enim eu. Ornare massa eget egestas purus viverra accumsan. Senectus et netus et malesuada fames ac. In egestas erat imperdiet sed euismod. Lacus luctus accumsan tortor posuere. Auctor augue mauris augue neque. Integer eget aliquet nibh praesent tristique magna sit amet purus. Est sit amet facilisis magna. Tincidunt tortor aliquam nulla facilisi. Non pulvinar neque laoreet suspendisse interdum. Neque laoreet suspendisse interdum consectetur.

    Nunc non blandit massa enim nec. Ornare suspendisse sed nisi lacus sed viverra. In egestas erat imperdiet sed euismod nisi. Est velit egestas dui id ornare. Amet consectetur adipiscing elit duis tristique sollicitudin. Tristique sollicitudin nibh sit amet commodo nulla facilisi nullam vehicula. Convallis aenean et tortor at risus. Egestas dui id ornare arcu. Quis ipsum suspendisse ultrices gravida. Eleifend mi in nulla posuere. Sit amet tellus cras adipiscing enim eu. Mauris augue neque gravida in fermentum et sollicitudin ac orci. Lorem ipsum dolor sit amet consectetur adipiscing elit.

    Consequat id porta nibh venenatis cras sed. Quis viverra nibh cras pulvinar mattis nunc sed blandit. Arcu cursus euismod quis viverra nibh cras pulvinar mattis nunc. Adipiscing tristique risus nec feugiat in fermentum. Ultrices tincidunt arcu non sodales neque sodales ut etiam sit. Varius duis at consectetur lorem. Euismod quis viverra nibh cras pulvinar mattis nunc sed. Purus sit amet luctus venenatis. Sed velit dignissim sodales ut eu sem integer vitae justo. Massa tincidunt nunc pulvinar sapien et ligula ullamcorper malesuada proin. Praesent semper feugiat nibh sed. Erat imperdiet sed euismod nisi porta lorem. Semper feugiat nibh sed pulvinar proin.

    Eget felis eget nunc lobortis mattis. Imperdiet massa tincidunt nunc pulvinar sapien et ligula ullamcorper malesuada. Sed ullamcorper morbi tincidunt ornare massa eget egestas purus. Ullamcorper sit amet risus nullam. Risus nullam eget felis eget nunc lobortis mattis aliquam. Imperdiet massa tincidunt nunc pulvinar sapien et ligula ullamcorper malesuada. Eget velit aliquet sagittis id consectetur purus. Eu mi bibendum neque egestas congue quisque. Sagittis orci a scelerisque purus semper eget duis at tellus. Id neque aliquam vestibulum morbi blandit. Risus ultricies tristique nulla aliquet enim tortor at auctor urna. In tellus integer feugiat scelerisque varius. Mauris sit amet massa vitae tortor. Non pulvinar neque laoreet suspendisse interdum consectetur libero. Diam sit amet nisl suscipit adipiscing bibendum est ultricies. Ut tristique et egestas quis. Sagittis eu volutpat odio facilisis mauris sit. Ultricies mi eget mauris pharetra et ultrices. 
              </div>
            </ReflexElement>

          </ReflexContainer>
        </div>
        <div>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Enim sit amet venenatis urna. Dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Aenean sed adipiscing diam donec adipiscing tristique risus nec. Nulla facilisi nullam vehicula ipsum a. Nunc mi ipsum faucibus vitae aliquet nec ullamcorper sit amet. Vulputate ut pharetra sit amet aliquam id diam. Nulla facilisi nullam vehicula ipsum a arcu cursus. Porttitor eget dolor morbi non arcu risus quis. Lectus magna fringilla urna porttitor rhoncus dolor. Neque viverra justo nec ultrices dui. Suscipit tellus mauris a diam maecenas sed enim ut sem. Ut tellus elementum sagittis vitae et leo. Mauris pellentesque pulvinar pellentesque habitant morbi tristique senectus et. Non quam lacus suspendisse faucibus. Imperdiet proin fermentum leo vel orci. Nisl rhoncus mattis rhoncus urna neque viverra. Orci a scelerisque purus semper eget duis at tellus at.        
        </div>
      </div>
    )
  }
}