import React from 'react';
import style from 'HPCCloudStyle/ItemEditor.mcss';

export default React.createClass({

    displayName: 'Simulation/New/Visualizer',

    propTypes: {
        owner: React.PropTypes.func,
    },

    getInitialState() {
        return {
            mesh: null,
        };
    },

    componentDidMount() {

    },

    componentWillUnmount(){

    },

    processFile(event) {
        var file;
        if (event.target.files.length) {
            file = event.target.files[0];
        } else if (event.dataTransfer.files.length) {
            file = event.dataTransfer.files[0];
        }
        event.preventDefault();
        event.stopPropagation();

        if (!file) {
            return;
        }

        const name = event.target.dataset.name;
        this.setState({[name]: file.name});

        // Let's record attachement
        if(this.props.owner) {
            this.props.owner().addAttachement(name, file);
        }
    },

    render() {
        return (<div>
            <div className={style.group}>
                <label className={style.label}>Result file</label>
                <input
                    className={style.input}
                    data-name='mesh'
                    type="file"
                    value={this.state.mesh}
                    onChange={this.processFile}/>
            </div>
            </div>);
    },
});